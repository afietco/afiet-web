import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'

/**
 * Mağaza (App Store / Google Play) ölçümleri: günlük sayılar.
 *
 * Üç kaynak aynı tabloda yaşar ve `source` hangisi olduğunu söyler: `elle`
 * (panelden girilen), `csv` (mağaza dışa aktarımı), `api` (App Store Connect
 * Analytics raporundan otomatik). 24 Ağu 2026'da iOS yayına girince API fazı
 * açıldı: Go backend Apple'dan indirir, ayrıştırır ve landing DB'sine
 * `/api/internal/store-metrics` ucundan yazar. Backend'in kendi landing
 * havuzu bilinçli olarak salt okunurdur, yazma yolu budur.
 *
 * ELLE GİRİLEN SATIR API TARAFINDAN EZİLMEZ: Apple bir günü sonradan
 * düzeltebilir ama insanın yazdığı sayı insanın kararıdır, `upsertStoreEntry`
 * yalnız aynı ya da daha "otomatik" kaynağın üstüne yazar.
 *
 * seoStore/contentStore deseni: kendi kendini kuran tablo, DB yoksa yazma
 * uçları 503. (metric_date, platform) benzersizdir; aynı güne yeniden giriş
 * üzerine yazar.
 */

type Sql = NeonQueryFunction<false, false>
let ensured = false

export type StorePlatform = 'ios' | 'android'
export type StoreSource = 'elle' | 'csv' | 'api'

export type StoreEntry = {
  id: number
  metricDate: string
  platform: StorePlatform
  downloads: number
  /** Mağaza sayfası görüntüleme; bilinmiyorsa null (0'dan farklı). */
  pageViews: number | null
  /** Mağaza gösterimi (arama sonucunda/keşifte görünme); bilinmiyorsa null. */
  impressions: number | null
  note: string
  source: StoreSource
}
export type StoreEntryInput = Omit<StoreEntry, 'id'>

/**
 * Trafik kaynağı kırılımı (yalnız API'den gelir). `sourceType` Apple'ın HAM
 * etiketidir ("App Store Search", "App Referrer"...): normalize edilmiş bir
 * sözlüğe çevirmek, Apple yeni bir tür eklediği gün veriyi sessizce
 * "diğer"e gömerdi. Çeviri panelde yapılır, bilinmeyen tür olduğu gibi görünür.
 */
export type StoreTrafficSource = {
  metricDate: string
  platform: StorePlatform
  sourceType: string
  impressions: number
  pageViews: number
}

export type StoreData = {
  generatedAt: string
  live: boolean
  range: '7d' | '30d' | '90d'
  totals: {
    ios: number
    android: number
    pageViews: number
    impressions: number
    conversionPct: number
  }
  series: { date: string; ios: number; android: number }[]
  entries: StoreEntry[]
  /** Aralığın tamamı için kaynak başına toplam; boşsa API henüz yazmamıştır. */
  trafficSources: { sourceType: string; impressions: number; pageViews: number }[]
}

export async function requireStoreDb(event: H3Event): Promise<Sql> {
  const url = useRuntimeConfig(event).databaseUrl
  if (!url) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })
  const sql = neon(url)
  await ensureStoreTables(sql)
  return sql
}

export async function ensureStoreTables(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS store_metrics (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      metric_date date NOT NULL,
      platform text NOT NULL CHECK (platform IN ('ios','android')),
      downloads int NOT NULL DEFAULT 0,
      page_views int,
      note text NOT NULL DEFAULT '',
      source text NOT NULL DEFAULT 'elle' CHECK (source IN ('elle','csv')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (metric_date, platform)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS store_metrics_date_idx ON store_metrics (metric_date)`
  // Şema büyürken (contentStore deseni): tablo prod'da veriyle yaşıyor,
  // CREATE TABLE IF NOT EXISTS yetmez. Kolon eklemeli, CHECK adlandırılıp
  // düşürülüp yeniden kurulur; kolon silme ya da tip daraltma yapılmaz.
  await sql`ALTER TABLE store_metrics ADD COLUMN IF NOT EXISTS impressions int`
  await sql`ALTER TABLE store_metrics DROP CONSTRAINT IF EXISTS store_metrics_source_check`
  await sql`
    ALTER TABLE store_metrics
    ADD CONSTRAINT store_metrics_source_check CHECK (source IN ('elle','csv','api'))
  `
  await sql`
    CREATE TABLE IF NOT EXISTS store_traffic_sources (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      metric_date date NOT NULL,
      platform text NOT NULL CHECK (platform IN ('ios','android')),
      source_type text NOT NULL,
      impressions int NOT NULL DEFAULT 0,
      page_views int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (metric_date, platform, source_type)
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS store_traffic_sources_date_idx
    ON store_traffic_sources (metric_date)
  `
  ensured = true
}

type Row = Record<string, unknown>

function toEntry(row: Row): StoreEntry {
  return {
    id: Number(row.id),
    metricDate: String(row.metric_date),
    platform: row.platform as StorePlatform,
    downloads: Number(row.downloads),
    pageViews: row.page_views === null ? null : Number(row.page_views),
    impressions: row.impressions === null ? null : Number(row.impressions),
    note: String(row.note ?? ''),
    source: (row.source as StoreSource) ?? 'elle',
  }
}

/**
 * Kaynak önceliği: elle (2) > csv (1) > api (0). Aynı ya da daha yüksek
 * öncelikli kaynak üstüne yazar, düşük olan yazamaz. Yani gece koşan cron
 * panelde elle düzeltilmiş bir günü geri almaz; o günü yeniden API'ye
 * bırakmanın yolu satırı panelden silmektir.
 */
export async function upsertStoreEntry(sql: Sql, input: StoreEntryInput): Promise<void> {
  await sql`
    INSERT INTO store_metrics (metric_date, platform, downloads, page_views, impressions, note, source)
    VALUES (
      ${input.metricDate}, ${input.platform}, ${input.downloads},
      ${input.pageViews}, ${input.impressions}, ${input.note}, ${input.source}
    )
    ON CONFLICT (metric_date, platform) DO UPDATE SET
      downloads = EXCLUDED.downloads,
      page_views = EXCLUDED.page_views,
      impressions = EXCLUDED.impressions,
      note = EXCLUDED.note,
      source = EXCLUDED.source,
      updated_at = now()
    WHERE
      (CASE EXCLUDED.source WHEN 'elle' THEN 2 WHEN 'csv' THEN 1 ELSE 0 END)
      >= (CASE store_metrics.source WHEN 'elle' THEN 2 WHEN 'csv' THEN 1 ELSE 0 END)
  `
}

/**
 * API'nin yazma yolu: KISMİ güncelleme. Apple'ın iki raporu aynı güne farklı
 * açılardan bakar (biri indirmeyi bilir, öbürü gösterimi) ve ikisi ayrı
 * dosyalarda, ayrı günlerde gelebilir. null gelen alan "ölçülmedi" demektir,
 * "sıfır" değil: sıfır yazsaydık ikinci rapor birincinin sayısını silerdi.
 *
 * Elle ve CSV girilmiş satırlara DOKUNMAZ (aynı kaynak önceliği kuralı):
 * insanın yazdığı bir günü gece koşan cron geri almaz.
 */
export async function upsertStoreApiEntry(
  sql: Sql,
  input: {
    metricDate: string
    platform: StorePlatform
    downloads: number | null
    pageViews: number | null
    impressions: number | null
    note: string
  },
): Promise<void> {
  await sql`
    INSERT INTO store_metrics (metric_date, platform, downloads, page_views, impressions, note, source)
    VALUES (
      ${input.metricDate}, ${input.platform}, COALESCE(${input.downloads}::int, 0),
      ${input.pageViews}::int, ${input.impressions}::int, ${input.note}, 'api'
    )
    ON CONFLICT (metric_date, platform) DO UPDATE SET
      downloads = COALESCE(${input.downloads}::int, store_metrics.downloads),
      page_views = COALESCE(${input.pageViews}::int, store_metrics.page_views),
      impressions = COALESCE(${input.impressions}::int, store_metrics.impressions),
      note = CASE WHEN ${input.note} <> '' THEN ${input.note} ELSE store_metrics.note END,
      source = 'api',
      updated_at = now()
    WHERE store_metrics.source NOT IN ('elle', 'csv')
  `
}

/** Trafik kaynağı satırı; yalnız API yazar, çakışmada her zaman üstüne yazar. */
export async function upsertTrafficSource(sql: Sql, input: StoreTrafficSource): Promise<void> {
  await sql`
    INSERT INTO store_traffic_sources (metric_date, platform, source_type, impressions, page_views)
    VALUES (${input.metricDate}, ${input.platform}, ${input.sourceType}, ${input.impressions}, ${input.pageViews})
    ON CONFLICT (metric_date, platform, source_type) DO UPDATE SET
      impressions = EXCLUDED.impressions,
      page_views = EXCLUDED.page_views,
      updated_at = now()
  `
}

export async function deleteStoreEntry(sql: Sql, id: number): Promise<void> {
  await sql`DELETE FROM store_metrics WHERE id = ${id}`
}

export async function aggregateStore(sql: Sql, range: '7d' | '30d' | '90d'): Promise<StoreData> {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
  const rows = (await sql`
    SELECT id, metric_date::text AS metric_date, platform, downloads, page_views,
           impressions, note, source
    FROM store_metrics
    WHERE metric_date >= current_date - ${days - 1}::int
    ORDER BY metric_date DESC, platform
  `) as Row[]
  const entries = rows.map(toEntry)

  const sourceRows = (await sql`
    SELECT source_type, SUM(impressions)::int AS impressions, SUM(page_views)::int AS page_views
    FROM store_traffic_sources
    WHERE metric_date >= current_date - ${days - 1}::int
    GROUP BY source_type
    ORDER BY SUM(impressions) DESC
  `) as Row[]
  const trafficSources = sourceRows.map((r) => ({
    sourceType: String(r.source_type),
    impressions: Number(r.impressions),
    pageViews: Number(r.page_views),
  }))

  // Gün listesi: aralıktaki her gün, veri olmasa da 0 ile çizilir.
  const dayRows = (await sql`
    SELECT generate_series(current_date - ${days - 1}::int, current_date, interval '1 day')::date::text AS d
  `) as Row[]
  const byDate = new Map<string, { ios: number; android: number }>()
  for (const { d } of dayRows) byDate.set(String(d), { ios: 0, android: 0 })
  for (const e of entries) {
    const bucket = byDate.get(e.metricDate)
    if (bucket) bucket[e.platform] += e.downloads
  }
  const series = [...byDate.entries()].map(([date, v]) => ({ date, ...v }))

  const ios = entries.filter((e) => e.platform === 'ios').reduce((s, e) => s + e.downloads, 0)
  const android = entries.filter((e) => e.platform === 'android').reduce((s, e) => s + e.downloads, 0)
  // Dönüşüm yalnız sayfa görüntülemesi BİLİNEN kayıtlar üzerinden: tüm
  // indirmeyi kısmi görüntülemeye bölmek %100 üstü saçma oran üretir.
  const withViews = entries.filter((e) => e.pageViews !== null)
  const pageViews = withViews.reduce((s, e) => s + (e.pageViews ?? 0), 0)
  const downloadsWithViews = withViews.reduce((s, e) => s + e.downloads, 0)
  // Gösterim aynı gerekçeyle yalnız BİLİNEN kayıtlardan toplanır: elle
  // girilmiş bir günün gösterimi yoktur ve onu 0 saymak toplamı bozar.
  const impressions = entries.reduce((s, e) => s + (e.impressions ?? 0), 0)

  return {
    generatedAt: new Date().toISOString(),
    live: true,
    range,
    totals: {
      ios,
      android,
      pageViews,
      impressions,
      conversionPct: pageViews > 0 ? Math.round((downloadsWithViews / pageViews) * 100) : 0,
    },
    series,
    entries,
    trafficSources,
  }
}

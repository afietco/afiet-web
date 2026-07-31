import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'

/**
 * Mağaza (App Store / Google Play) ölçümleri: elle/CSV girilen günlük sayılar.
 * Karar (31 Tem 2026): mağaza yayınına dek otomatik API yok; yayın sonrası
 * App Store Connect + Play API'leri ayrı fazda bağlanır ve bu tabloya yazar
 * (source alanı o gün 'api' değeri kazanır).
 *
 * seoStore/contentStore deseni: kendi kendini kuran tablo, DB yoksa yazma
 * uçları 503. (metric_date, platform) benzersizdir; aynı güne yeniden giriş
 * üzerine yazar.
 */

type Sql = NeonQueryFunction<false, false>
let ensured = false

export type StorePlatform = 'ios' | 'android'
export type StoreEntry = {
  id: number
  metricDate: string
  platform: StorePlatform
  downloads: number
  /** Mağaza sayfası görüntüleme; bilinmiyorsa null (0'dan farklı). */
  pageViews: number | null
  note: string
  source: 'elle' | 'csv'
}
export type StoreEntryInput = Omit<StoreEntry, 'id'>

export type StoreData = {
  generatedAt: string
  live: boolean
  range: '7d' | '30d' | '90d'
  totals: { ios: number; android: number; pageViews: number; conversionPct: number }
  series: { date: string; ios: number; android: number }[]
  entries: StoreEntry[]
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
    note: String(row.note ?? ''),
    source: (row.source as 'elle' | 'csv') ?? 'elle',
  }
}

export async function upsertStoreEntry(sql: Sql, input: StoreEntryInput): Promise<void> {
  await sql`
    INSERT INTO store_metrics (metric_date, platform, downloads, page_views, note, source)
    VALUES (${input.metricDate}, ${input.platform}, ${input.downloads}, ${input.pageViews}, ${input.note}, ${input.source})
    ON CONFLICT (metric_date, platform) DO UPDATE SET
      downloads = EXCLUDED.downloads,
      page_views = EXCLUDED.page_views,
      note = EXCLUDED.note,
      source = EXCLUDED.source,
      updated_at = now()
  `
}

export async function deleteStoreEntry(sql: Sql, id: number): Promise<void> {
  await sql`DELETE FROM store_metrics WHERE id = ${id}`
}

export async function aggregateStore(sql: Sql, range: '7d' | '30d' | '90d'): Promise<StoreData> {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
  const rows = (await sql`
    SELECT id, metric_date::text AS metric_date, platform, downloads, page_views, note, source
    FROM store_metrics
    WHERE metric_date >= current_date - ${days - 1}::int
    ORDER BY metric_date DESC, platform
  `) as Row[]
  const entries = rows.map(toEntry)

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

  return {
    generatedAt: new Date().toISOString(),
    live: true,
    range,
    totals: {
      ios,
      android,
      pageViews,
      conversionPct: pageViews > 0 ? Math.round((downloadsWithViews / pageViews) * 100) : 0,
    },
    series,
    entries,
  }
}

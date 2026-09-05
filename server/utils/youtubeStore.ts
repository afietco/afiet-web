import { dbSql, type Sql } from './db'
import type { H3Event } from 'h3'

/**
 * YouTube analitiğinin yerel kopyası. Günlük cron (/api/cron/social-metrics)
 * YouTube Analytics API'sinden çekip buraya upsert eder; panel yalnız bu
 * tablolardan okur (her istekte Google'a gidilmez, gsc_daily deseninin aynısı).
 *
 * ÜÇ TABLO, ÜÇ AYRI SEBEP:
 *
 *   `youtube_daily`  gün başına kanal toplamı. YouTube gerçek gün kırılımı
 *     verdiği için Instagram'daki "anlık görüntü farkı" hilesi burada YOK.
 *
 *   `youtube_rows`   gün başına kırılım (trafik kaynağı, ülke, cihaz). Üçü de
 *     `day` boyutuyla birlikte sorgulanabiliyor ve metriği (views) TOPLANABİLİR
 *     olduğu için tarih başına satır tutulur; aralık toplamı tek SQL'dir.
 *
 *   `youtube_videos` + `youtube_demographics`  ARALIK ANLIK GÖRÜNTÜSÜ. Sebebi
 *     API kısıtı: `video` boyutu `day` ile BİRLEŞTİRİLEMEZ, demografi ise
 *     yalnız `viewerPercentage` döndürür ve yüzde günler arasında toplanamaz.
 *     Bu yüzden senkron her turda 7/30/90 günlük pencereleri ayrı ayrı sorar ve
 *     satırları o pencerenin altına yazar. Panelin aralık düğmesi bu anahtarla
 *     birebir eşleşir. `omur` penceresi ise videonun ömür toplamıdır ve
 *     içerik takvimine (`content_metrics`) yazılan sayı odur.
 *
 * GÖSTERİM (impressions) ve CTR HİÇBİR TABLODA YOK: YouTube bu ikisini
 * Analytics API'sine de Reporting API'sine de açmıyor, yalnız Studio'da var.
 * Kolonu "ileride doldururuz" diye açma, boş kolon vaat eder.
 */

type Row = Record<string, unknown>

let ensured = false

export type YtRange = '7d' | '30d' | '90d'
export type YtWindow = YtRange | 'omur'
export const YT_WINDOWS: YtWindow[] = ['7d', '30d', '90d', 'omur']
export const YT_RANGE_DAYS: Record<YtRange, number> = { '7d': 7, '30d': 30, '90d': 90 }

/** Kırılım boyutları; hepsinin metriği `views`, yani gün gün toplanabilir. */
export type YtDimension = 'traffic' | 'country' | 'device'

export type YtDailyInput = {
  date: string
  views: number
  minutesWatched: number
  avgViewPercentage: number
  subscribersGained: number
  subscribersLost: number
}

export type YtVideoInput = {
  rangeKey: YtWindow
  videoId: string
  views: number
  minutesWatched: number
  avgViewDuration: number
  avgViewPercentage: number
  subscribersGained: number
  likes: number
  comments: number
  shares: number
}

function sqlClient(event: H3Event): Sql | null {
  const url = useRuntimeConfig(event).databaseUrl
  return dbSql(url)
}

export async function requireYouTubeDb(event: H3Event): Promise<Sql> {
  const sql = sqlClient(event)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })
  await ensureYouTubeTables(sql)
  return sql
}

export async function ensureYouTubeTables(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS youtube_daily (
      metric_date date PRIMARY KEY,
      views bigint NOT NULL DEFAULT 0,
      minutes_watched bigint NOT NULL DEFAULT 0,
      avg_view_percentage real NOT NULL DEFAULT 0,
      subscribers_gained int NOT NULL DEFAULT 0,
      subscribers_lost int NOT NULL DEFAULT 0,
      -- Abone TOPLAMI Analytics'ten gelmez (o yalnız kazanılan/kaybedileni
      -- verir); Data API'nin o günkü sayısı senkron gününe yazılır, diğer
      -- günler NULL kalır. Panel en son dolu satırı okur.
      subscribers_total int,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS youtube_rows (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      metric_date date NOT NULL,
      dimension text NOT NULL CHECK (dimension IN ('traffic','country','device')),
      key text NOT NULL,
      views bigint NOT NULL DEFAULT 0,
      minutes_watched bigint NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (metric_date, dimension, key)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS youtube_rows_dim_date_idx ON youtube_rows (dimension, metric_date)`
  // `window` Postgres'te ayrılmış sözcük; kolon adı bilerek `range_key`.
  await sql`
    CREATE TABLE IF NOT EXISTS youtube_videos (
      range_key text NOT NULL CHECK (range_key IN ('7d','30d','90d','omur')),
      video_id text NOT NULL,
      views bigint NOT NULL DEFAULT 0,
      minutes_watched bigint NOT NULL DEFAULT 0,
      avg_view_duration int NOT NULL DEFAULT 0,
      avg_view_percentage real NOT NULL DEFAULT 0,
      subscribers_gained int NOT NULL DEFAULT 0,
      likes int NOT NULL DEFAULT 0,
      comments int NOT NULL DEFAULT 0,
      shares int NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (range_key, video_id)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS youtube_demographics (
      range_key text NOT NULL CHECK (range_key IN ('7d','30d','90d')),
      key text NOT NULL,
      share_pct real NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (range_key, key)
    )
  `
  ensured = true
}

// ── Yazma ────────────────────────────────────────────────────────────────────

export async function upsertYouTubeDaily(sql: Sql, input: YtDailyInput): Promise<void> {
  await sql`
    INSERT INTO youtube_daily (metric_date, views, minutes_watched, avg_view_percentage,
                               subscribers_gained, subscribers_lost)
    VALUES (${input.date}, ${input.views}, ${input.minutesWatched}, ${input.avgViewPercentage},
            ${input.subscribersGained}, ${input.subscribersLost})
    ON CONFLICT (metric_date) DO UPDATE SET
      views = EXCLUDED.views,
      minutes_watched = EXCLUDED.minutes_watched,
      avg_view_percentage = EXCLUDED.avg_view_percentage,
      subscribers_gained = EXCLUDED.subscribers_gained,
      subscribers_lost = EXCLUDED.subscribers_lost,
      updated_at = now()
  `
}

/**
 * Abone toplamını o günün satırına yazar. Satır yoksa AÇILIR: kanalın hiç
 * izlenmediği bir günde de abone sayısı bilinsin (kart boş kalmasın).
 */
export async function upsertSubscriberTotal(sql: Sql, date: string, total: number): Promise<void> {
  await sql`
    INSERT INTO youtube_daily (metric_date, subscribers_total)
    VALUES (${date}, ${total})
    ON CONFLICT (metric_date) DO UPDATE SET subscribers_total = EXCLUDED.subscribers_total, updated_at = now()
  `
}

export async function upsertYouTubeRow(
  sql: Sql,
  date: string,
  dimension: YtDimension,
  key: string,
  views: number,
  minutesWatched: number,
): Promise<void> {
  await sql`
    INSERT INTO youtube_rows (metric_date, dimension, key, views, minutes_watched)
    VALUES (${date}, ${dimension}, ${key}, ${views}, ${minutesWatched})
    ON CONFLICT (metric_date, dimension, key) DO UPDATE SET
      views = EXCLUDED.views, minutes_watched = EXCLUDED.minutes_watched, updated_at = now()
  `
}

/**
 * Bir pencerenin video satırlarını YENİLER: önce o pencere silinir, sonra
 * gelenler yazılır. Sebep: pencere kayan bir aralıktır, dünkü listede olup
 * bugün aralığın dışında kalan video satırı DURMAMALI.
 */
export async function replaceYouTubeVideos(sql: Sql, rangeKey: YtWindow, rows: YtVideoInput[]): Promise<void> {
  await sql`DELETE FROM youtube_videos WHERE range_key = ${rangeKey}`
  for (const r of rows) {
    await sql`
      INSERT INTO youtube_videos (range_key, video_id, views, minutes_watched, avg_view_duration,
                                  avg_view_percentage, subscribers_gained, likes, comments, shares)
      VALUES (${rangeKey}, ${r.videoId}, ${r.views}, ${r.minutesWatched}, ${r.avgViewDuration},
              ${r.avgViewPercentage}, ${r.subscribersGained}, ${r.likes}, ${r.comments}, ${r.shares})
      ON CONFLICT (range_key, video_id) DO UPDATE SET
        views = EXCLUDED.views, minutes_watched = EXCLUDED.minutes_watched,
        avg_view_duration = EXCLUDED.avg_view_duration, avg_view_percentage = EXCLUDED.avg_view_percentage,
        subscribers_gained = EXCLUDED.subscribers_gained, likes = EXCLUDED.likes,
        comments = EXCLUDED.comments, shares = EXCLUDED.shares, updated_at = now()
    `
  }
}

/** Demografi de pencere anlık görüntüsüdür; aynı yenileme kuralı geçerli. */
export async function replaceYouTubeDemographics(
  sql: Sql,
  rangeKey: YtRange,
  rows: { key: string; sharePct: number }[],
): Promise<void> {
  await sql`DELETE FROM youtube_demographics WHERE range_key = ${rangeKey}`
  for (const r of rows) {
    await sql`
      INSERT INTO youtube_demographics (range_key, key, share_pct)
      VALUES (${rangeKey}, ${r.key}, ${r.sharePct})
      ON CONFLICT (range_key, key) DO UPDATE SET share_pct = EXCLUDED.share_pct, updated_at = now()
    `
  }
}

// ── Okuma ────────────────────────────────────────────────────────────────────

export type YouTubeVideoRow = {
  videoId: string
  title: string
  itemId: number | null
  format: string
  publishedAt: string | null
  views: number
  minutesWatched: number
  avgViewDuration: number
  avgViewPercentage: number
  subscribersGained: number
  likes: number
  comments: number
}

export type YouTubeData = {
  generatedAt: string
  live: boolean
  range: YtRange
  connected: boolean
  channelTitle: string
  lastSyncAt: string | null
  totals: {
    views: number
    minutesWatched: number
    avgViewPercentage: number
    subscribersGained: number
    subscribersLost: number
    subscribers: number
    videos: number
  }
  series: { date: string; views: number; minutesWatched: number }[]
  videos: YouTubeVideoRow[]
  traffic: { key: string; views: number; minutesWatched: number }[]
  countries: { key: string; label: string; views: number; sharePct: number }[]
  devices: { key: string; label: string; views: number; sharePct: number }[]
  ageGender: { key: string; label: string; views: number; sharePct: number }[]
}

const DEVICE_LABEL: Record<string, string> = {
  MOBILE: 'Telefon',
  DESKTOP: 'Bilgisayar',
  TABLET: 'Tablet',
  TV: 'Televizyon',
  GAME_CONSOLE: 'Oyun konsolu',
  UNKNOWN_PLATFORM: 'Bilinmiyor',
}

const GENDER_LABEL: Record<string, string> = { female: 'Kadın', male: 'Erkek', user_specified: 'Belirtmiş', gender_other: 'Diğer' }

/**
 * Ülke adı ICU'dan gelir (Intl.DisplayNames, tr). Elle sözlük tutmuyoruz:
 * YouTube ISO-3166 alpha-2 döndürüyor ve 200'den fazla kod var. ICU yoksa ya
 * da kod tanınmazsa HAM KOD gösterilir, uydurma yapılmaz.
 */
let regionNames: Intl.DisplayNames | null = null
function countryLabel(code: string): string {
  try {
    if (!regionNames) regionNames = new Intl.DisplayNames(['tr'], { type: 'region' })
    return regionNames.of(code) ?? code
  } catch {
    return code
  }
}

/** 'female:age25-34' → 'Kadın 25-34'. Tanınmayan parça ham geçer. */
function demographicLabel(key: string): string {
  const [gender, age] = key.split(':')
  const g = GENDER_LABEL[gender ?? ''] ?? gender ?? ''
  const a = (age ?? '').replace(/^age/, '').replace(/-$/, '+')
  return `${g} ${a}`.trim()
}

function dayKeys(days: number): string[] {
  const out: string[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

const num = (v: unknown): number => Number(v ?? 0) || 0

export async function buildYouTubeData(sql: Sql, range: YtRange): Promise<YouTubeData> {
  const days = YT_RANGE_DAYS[range]
  const keys = dayKeys(days)
  const start = keys[0]!
  const end = keys[keys.length - 1]!

  const [daily, account, videoRows, traffic, breakdowns, demographics, latestSubs] = await Promise.all([
    sql`
      SELECT metric_date::text AS metric_date, views, minutes_watched, avg_view_percentage,
             subscribers_gained, subscribers_lost
      FROM youtube_daily WHERE metric_date BETWEEN ${start} AND ${end} ORDER BY metric_date
    `,
    sql`SELECT handle, last_sync_at FROM social_accounts WHERE platform = 'youtube' LIMIT 1`,
    sql`
      SELECT v.video_id, v.views, v.minutes_watched, v.avg_view_duration, v.avg_view_percentage,
             v.subscribers_gained, v.likes, v.comments,
             p.media_type, p.caption, p.published_at, p.item_id, i.title AS item_title
      FROM youtube_videos v
      LEFT JOIN social_posts p ON p.platform = 'youtube' AND p.external_id = v.video_id
      LEFT JOIN content_items i ON i.id = p.item_id
      WHERE v.range_key = ${range}
      ORDER BY v.views DESC
      LIMIT 50
    `,
    sql`
      SELECT key, sum(views)::bigint AS views, sum(minutes_watched)::bigint AS minutes_watched
      FROM youtube_rows WHERE dimension = 'traffic' AND metric_date BETWEEN ${start} AND ${end}
      GROUP BY key ORDER BY views DESC
    `,
    sql`
      SELECT dimension, key, sum(views)::bigint AS views
      FROM youtube_rows WHERE dimension IN ('country','device') AND metric_date BETWEEN ${start} AND ${end}
      GROUP BY dimension, key ORDER BY views DESC
    `,
    sql`SELECT key, share_pct FROM youtube_demographics WHERE range_key = ${range} ORDER BY share_pct DESC`,
    sql`
      SELECT subscribers_total FROM youtube_daily
      WHERE subscribers_total IS NOT NULL ORDER BY metric_date DESC LIMIT 1
    `,
  ])

  const byDate = new Map((daily as Row[]).map((r) => [String(r.metric_date).slice(0, 10), r]))
  const series = keys.map((date) => {
    const r = byDate.get(date)
    return { date, views: num(r?.views), minutesWatched: num(r?.minutes_watched) }
  })

  const totalViews = series.reduce((s, p) => s + p.views, 0)
  // Ortalama izlenme yüzdesi GÖRÜNTÜLENMEYLE AĞIRLIKLI: günleri düz ortalamak
  // 3 izlenmiş günü 3.000 izlenmiş günle eşitlerdi.
  const weighted = (daily as Row[]).reduce((s, r) => s + num(r.avg_view_percentage) * num(r.views), 0)
  const avgViewPercentage = totalViews > 0 ? Math.round((weighted / totalViews) * 10) / 10 : 0

  const share = (views: number, total: number) => (total > 0 ? Math.round((views / total) * 1000) / 10 : 0)

  const countryRows = (breakdowns as Row[]).filter((r) => r.dimension === 'country')
  const deviceRows = (breakdowns as Row[]).filter((r) => r.dimension === 'device')
  const countryTotal = countryRows.reduce((s, r) => s + num(r.views), 0)
  const deviceTotal = deviceRows.reduce((s, r) => s + num(r.views), 0)

  const accountRow = (account as Row[])[0]

  return {
    generatedAt: new Date().toISOString(),
    live: true,
    range,
    connected: Boolean(accountRow),
    channelTitle: String(accountRow?.handle ?? ''),
    lastSyncAt: accountRow?.last_sync_at ? new Date(String(accountRow.last_sync_at)).toISOString() : null,
    totals: {
      views: totalViews,
      minutesWatched: series.reduce((s, p) => s + p.minutesWatched, 0),
      avgViewPercentage,
      subscribersGained: (daily as Row[]).reduce((s, r) => s + num(r.subscribers_gained), 0),
      subscribersLost: (daily as Row[]).reduce((s, r) => s + num(r.subscribers_lost), 0),
      subscribers: num((latestSubs as Row[])[0]?.subscribers_total),
      videos: (videoRows as Row[]).length,
    },
    series,
    videos: (videoRows as Row[]).map((r) => ({
      videoId: String(r.video_id),
      // Başlık önce takvim etkinliğinden, yoksa YouTube'daki başlıktan
      // (senkron onu `social_posts.caption`a yazar), o da yoksa kimlikten.
      title: String(r.item_title || r.caption || r.video_id),
      itemId: r.item_id === null || r.item_id === undefined ? null : Number(r.item_id),
      format: String(r.media_type || 'video'),
      publishedAt: r.published_at ? String(new Date(String(r.published_at)).toISOString()).slice(0, 10) : null,
      views: num(r.views),
      minutesWatched: num(r.minutes_watched),
      avgViewDuration: num(r.avg_view_duration),
      avgViewPercentage: Math.round(num(r.avg_view_percentage) * 10) / 10,
      subscribersGained: num(r.subscribers_gained),
      likes: num(r.likes),
      comments: num(r.comments),
    })),
    traffic: (traffic as Row[]).map((r) => ({
      key: String(r.key),
      views: num(r.views),
      minutesWatched: num(r.minutes_watched),
    })),
    countries: countryRows.map((r) => ({
      key: String(r.key),
      label: countryLabel(String(r.key)),
      views: num(r.views),
      sharePct: share(num(r.views), countryTotal),
    })),
    devices: deviceRows.map((r) => ({
      key: String(r.key),
      label: DEVICE_LABEL[String(r.key)] ?? String(r.key),
      views: num(r.views),
      sharePct: share(num(r.views), deviceTotal),
    })),
    ageGender: (demographics as Row[]).map((r) => ({
      key: String(r.key),
      label: demographicLabel(String(r.key)),
      // Demografi yüzde olarak gelir; görüntülenme sayısı YOKTUR. Payı
      // görüntülenmeden türetmek uydurma olurdu, alan 0 kalır.
      views: 0,
      sharePct: Math.round(num(r.share_pct) * 10) / 10,
    })),
  }
}

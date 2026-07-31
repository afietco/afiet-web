import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'

/**
 * Google Search Console verisinin yerel kopyası. Günlük cron
 * (/api/cron/gsc-sync) Search Analytics API'sinden çekip buraya upsert eder;
 * panel yalnız bu tablolardan okur (her istekte Google'a gidilmez).
 *
 * Neden kopya: GSC API 16 aydan eskisini vermez ve sorgu başına gecikmelidir;
 * kendi Neon'umuzda tutunca aralık toplamları tek SQL ile çıkar.
 * ctr kolonu YOK: tıklama/gösterim toplamından her zaman türetilir.
 * Pozisyon gösterimle ağırlıklandırılarak ortalanır.
 */

type Sql = NeonQueryFunction<false, false>
let ensured = false

export type GscDimension = 'query' | 'page'
export type GscRow = { key: string; clicks: number; impressions: number; ctr: number; position: number }
export type GscData = {
  generatedAt: string
  live: boolean
  range: '7d' | '30d' | '90d'
  /** Servis hesabı anahtarı yapılandırılmış mı (kurulum rozeti için). */
  connected: boolean
  /** Son başarılı senkron zamanı; hiç yoksa null. */
  lastSyncAt: string | null
  totals: { clicks: number; impressions: number; ctrPct: number; position: number }
  series: { date: string; clicks: number; impressions: number }[]
  queries: GscRow[]
  pages: GscRow[]
}

export async function requireGscDb(event: H3Event): Promise<Sql> {
  const url = useRuntimeConfig(event).databaseUrl
  if (!url) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })
  const sql = neon(url)
  await ensureGscTables(sql)
  return sql
}

export async function ensureGscTables(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS gsc_daily (
      metric_date date PRIMARY KEY,
      clicks int NOT NULL DEFAULT 0,
      impressions int NOT NULL DEFAULT 0,
      position real NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS gsc_rows (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      metric_date date NOT NULL,
      dimension text NOT NULL CHECK (dimension IN ('query','page')),
      key text NOT NULL,
      clicks int NOT NULL DEFAULT 0,
      impressions int NOT NULL DEFAULT 0,
      position real NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (metric_date, dimension, key)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS gsc_rows_dim_date_idx ON gsc_rows (dimension, metric_date)`
  ensured = true
}

export async function upsertGscDaily(sql: Sql, date: string, clicks: number, impressions: number, position: number) {
  await sql`
    INSERT INTO gsc_daily (metric_date, clicks, impressions, position)
    VALUES (${date}, ${clicks}, ${impressions}, ${position})
    ON CONFLICT (metric_date) DO UPDATE SET
      clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions,
      position = EXCLUDED.position, updated_at = now()
  `
}

export async function upsertGscRow(
  sql: Sql,
  date: string,
  dimension: GscDimension,
  key: string,
  clicks: number,
  impressions: number,
  position: number,
) {
  await sql`
    INSERT INTO gsc_rows (metric_date, dimension, key, clicks, impressions, position)
    VALUES (${date}, ${dimension}, ${key}, ${clicks}, ${impressions}, ${position})
    ON CONFLICT (metric_date, dimension, key) DO UPDATE SET
      clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions,
      position = EXCLUDED.position, updated_at = now()
  `
}

type Row = Record<string, unknown>

const round1 = (n: number) => Math.round(n * 10) / 10

function toDimRow(row: Row): GscRow {
  const clicks = Number(row.clicks)
  const impressions = Number(row.impressions)
  return {
    key: String(row.key),
    clicks,
    impressions,
    ctr: impressions > 0 ? round1((clicks / impressions) * 100) : 0,
    position: round1(Number(row.position)),
  }
}

export async function aggregateGsc(sql: Sql, range: '7d' | '30d' | '90d', connected: boolean): Promise<GscData> {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30

  const daily = (await sql`
    SELECT d::text AS date, COALESCE(g.clicks, 0) AS clicks, COALESCE(g.impressions, 0) AS impressions
    FROM generate_series(current_date - ${days - 1}::int, current_date, interval '1 day') AS d
    LEFT JOIN gsc_daily g ON g.metric_date = d::date
    ORDER BY d
  `) as Row[]
  const series = daily.map((r) => ({ date: String(r.date).slice(0, 10), clicks: Number(r.clicks), impressions: Number(r.impressions) }))

  const totalsRow = (await sql`
    SELECT COALESCE(SUM(clicks), 0) AS clicks, COALESCE(SUM(impressions), 0) AS impressions,
           COALESCE(SUM(position * impressions) / NULLIF(SUM(impressions), 0), 0) AS position,
           MAX(updated_at) AS last_sync
    FROM gsc_daily WHERE metric_date >= current_date - ${days - 1}::int
  `) as Row[]
  const clicks = Number(totalsRow[0]?.clicks ?? 0)
  const impressions = Number(totalsRow[0]?.impressions ?? 0)

  const topOf = async (dimension: GscDimension) =>
    ((await sql`
      SELECT key, SUM(clicks) AS clicks, SUM(impressions) AS impressions,
             COALESCE(SUM(position * impressions) / NULLIF(SUM(impressions), 0), 0) AS position
      FROM gsc_rows
      WHERE dimension = ${dimension} AND metric_date >= current_date - ${days - 1}::int
      GROUP BY key
      ORDER BY SUM(clicks) DESC, SUM(impressions) DESC
      LIMIT 20
    `) as Row[]).map(toDimRow)

  return {
    generatedAt: new Date().toISOString(),
    live: true,
    range,
    connected,
    lastSyncAt: totalsRow[0]?.last_sync ? new Date(String(totalsRow[0].last_sync)).toISOString() : null,
    totals: {
      clicks,
      impressions,
      ctrPct: impressions > 0 ? round1((clicks / impressions) * 100) : 0,
      position: round1(Number(totalsRow[0]?.position ?? 0)),
    },
    series,
    queries: await topOf('query'),
    pages: await topOf('page'),
  }
}

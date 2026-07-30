import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'

/**
 * Durum sayfası veri katmanı. Kontroller SEO/analitik ile AYNI Neon'da,
 * kendi kendini kuran iki tabloda yaşar (golang-migrate şemasından bağımsız):
 *
 * - status_checks: 5 dakikada bir cron'un yazdığı ham kontrol sonuçları
 *   (bileşenler + 'provider:*' satırları). 100 günden eskisi silinir.
 * - status_incidents: olay kayıtları. Cron, bir bileşen 'down' olunca
 *   otomatik olay açar (source='auto'), toparlanınca kapatır. Elle girilen
 *   kayıtlar (source='manual') cron tarafından ASLA kapatılmaz.
 *
 * Yazan uç `POST /api/cron/status-check`, okuyan uç `GET /api/status`.
 * DDL burada TEK kaynaktır.
 */
type Sql = NeonQueryFunction<false, false>

export type ServiceState = 'up' | 'degraded' | 'down' | 'none'

export interface CheckResult {
  component: string
  state: Exclude<ServiceState, 'none'>
  latencyMs: number | null
  detail: string
}

/** Sayfada görünen bileşenler; sıra UI sırasıdır. */
export const COMPONENTS = [
  { id: 'api', name: 'Uygulama sunucusu', provider: 'Google Cloud Run · europe-west1', accent: 'sebze' },
  { id: 'db', name: 'Veritabanı', provider: 'Neon Postgres', accent: 'tahil' },
  { id: 'web', name: 'Web sitesi', provider: 'afiet.co · Vercel', accent: 'sut' },
  { id: 'afi', name: 'Afi yapay zekâ', provider: 'Azure AI Foundry', accent: 'protein' },
  { id: 'auth', name: 'Kimlik doğrulama', provider: 'Hexclave (Stack Auth)', accent: 'meyve' },
  { id: 'email', name: 'E-posta iletimi', provider: 'Resend', accent: 'sut' },
] as const

export type ComponentId = (typeof COMPONENTS)[number]['id']

/** Sağlayıcı satırları; state'leri status_checks'te 'provider:<id>' altında tutulur. */
export const PROVIDERS = [
  { id: 'vercel', name: 'Vercel', note: 'Web barındırma', url: 'https://www.vercel-status.com' },
  { id: 'neon', name: 'Neon', note: 'Veritabanı', url: 'https://neonstatus.com' },
  { id: 'gcp', name: 'Google Cloud', note: 'Sunucu altyapısı', url: 'https://status.cloud.google.com' },
  { id: 'azure', name: 'Microsoft Azure', note: 'Yapay zekâ servisleri', url: 'https://azure.status.microsoft' },
] as const

export function statusSql(event: H3Event): Sql | null {
  const url = useRuntimeConfig(event).databaseUrl
  return url ? neon(url) : null
}

let ensured = false
export async function ensureStatusTables(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS status_checks (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      component text NOT NULL,
      state text NOT NULL,
      latency_ms integer,
      detail text NOT NULL DEFAULT '',
      checked_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_status_checks_comp_time
      ON status_checks (component, checked_at DESC)
  `
  await sql`
    CREATE TABLE IF NOT EXISTS status_incidents (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      slug text UNIQUE,
      title text NOT NULL,
      affected text NOT NULL,
      detail text NOT NULL DEFAULT '',
      source text NOT NULL DEFAULT 'auto',
      started_at timestamptz NOT NULL,
      resolved_at timestamptz
    )
  `
  // 29 Temmuz 2026 kesintisi durum sayfasından eskidir; geçmiş bölümü boş
  // başlamasın diye tek seferlik tohumlanır (slug çakışırsa sessizce geçilir).
  await sql`
    INSERT INTO status_incidents (slug, title, affected, detail, source, started_at, resolved_at)
    VALUES (
      'db-2026-07-29',
      'Veritabanı bağlantı kesintisi',
      'api,db',
      'Havuzlu bağlantı ucunda oluşan bir yapılandırma sorunu uygulama sunucusunu etkiledi; sorun bulunup giderildi.',
      'manual',
      '2026-07-29T11:12:00Z',
      '2026-07-29T11:41:00Z'
    )
    ON CONFLICT (slug) DO NOTHING
  `
  ensured = true
}

export async function insertChecks(sql: Sql, results: CheckResult[]) {
  for (const r of results) {
    await sql`
      INSERT INTO status_checks (component, state, latency_ms, detail)
      VALUES (${r.component}, ${r.state}, ${r.latencyMs}, ${r.detail})
    `
  }
}

/**
 * Otomatik olay yönetimi: 'down' bileşene açık olay yoksa açar; toparlanan
 * bileşenin 'auto' olayını kapatır. Elle girilen kayıtlara dokunmaz.
 */
export async function reconcileIncidents(sql: Sql, results: CheckResult[]) {
  const open = (await sql`
    SELECT id, affected, source FROM status_incidents WHERE resolved_at IS NULL
  `) as { id: number; affected: string; source: string }[]

  const names = new Map<string, string>(COMPONENTS.map((c) => [c.id, c.name]))

  for (const r of results) {
    if (!names.has(r.component)) continue // provider satırları olay üretmez
    const mine = open.filter((o) => o.affected.split(',').includes(r.component))
    if (r.state === 'down' && mine.length === 0) {
      await sql`
        INSERT INTO status_incidents (title, affected, detail, source, started_at)
        VALUES (
          ${`${names.get(r.component)} kesintisi`},
          ${r.component},
          ${r.detail || 'Servis yanıt vermiyor; inceleniyor.'},
          'auto',
          now()
        )
      `
    } else if (r.state === 'up') {
      for (const o of mine) {
        if (o.source !== 'auto') continue
        await sql`UPDATE status_incidents SET resolved_at = now() WHERE id = ${o.id}`
      }
    }
  }
}

export async function pruneOldChecks(sql: Sql) {
  await sql`DELETE FROM status_checks WHERE checked_at < now() - interval '100 days'`
}

export interface DayPoint {
  date: string
  state: ServiceState
}

export interface StatusComponentOut {
  id: string
  name: string
  provider: string
  accent: (typeof COMPONENTS)[number]['accent']
  state: ServiceState
  /** 90 günde yüzde; hiç veri yoksa null */
  uptime: number | null
  days: DayPoint[]
}

export interface StatusPayload {
  overall: { state: ServiceState; checkedAt: string | null }
  components: StatusComponentOut[]
  providers: { id: string; name: string; note: string; url: string; state: ServiceState }[]
  incidents: {
    id: number
    title: string
    affected: string[]
    detail: string
    startedAt: string
    resolvedAt: string | null
  }[]
}

const WORST: Record<ServiceState, number> = { none: 0, up: 1, degraded: 2, down: 3 }

/** İstanbul gününe göre son 90 günün ISO listesi (eski günler başta). */
function last90Days(): string[] {
  const now = Date.now()
  const keys: string[] = []
  for (let i = 89; i >= 0; i--) {
    keys.push(new Date(now - i * 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }))
  }
  return keys
}

/** DB yokken (yerel boş kurulum) sayfanın çizdiği 'veri yok' iskeleti. */
export function emptyStatus(): StatusPayload {
  const days = last90Days().map((date) => ({ date, state: 'none' as ServiceState }))
  return {
    overall: { state: 'none', checkedAt: null },
    components: COMPONENTS.map((c) => ({ ...c, state: 'none', uptime: null, days: [...days] })),
    providers: PROVIDERS.map((p) => ({ ...p, state: 'none' })),
    incidents: [],
  }
}

/** Sayfanın tek seferde okuduğu toplam görünüm. */
export async function readStatus(sql: Sql): Promise<StatusPayload> {
  const latest = (await sql`
    SELECT DISTINCT ON (component) component, state, checked_at
    FROM status_checks
    ORDER BY component, checked_at DESC
  `) as { component: string; state: ServiceState; checked_at: string }[]

  // Gün kırılımı İstanbul saatiyle: kullanıcının "bugün"ü neyse o.
  const daily = (await sql`
    SELECT component,
           to_char(checked_at AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD') AS day,
           count(*) FILTER (WHERE state = 'down') AS down,
           count(*) FILTER (WHERE state = 'degraded') AS degraded,
           count(*) AS total
    FROM status_checks
    WHERE checked_at > now() - interval '91 days'
    GROUP BY component, day
  `) as { component: string; day: string; down: string; degraded: string; total: string }[]

  const incidents = (await sql`
    SELECT id, title, affected, detail, started_at, resolved_at
    FROM status_incidents
    WHERE started_at > now() - interval '90 days'
    ORDER BY started_at DESC
    LIMIT 20
  `) as {
    id: number
    title: string
    affected: string
    detail: string
    started_at: string
    resolved_at: string | null
  }[]

  const latestOf = new Map(latest.map((l) => [l.component, l]))
  const dailyOf = new Map<string, Map<string, { down: number; degraded: number; total: number }>>()
  for (const d of daily) {
    const m = dailyOf.get(d.component) ?? new Map()
    m.set(d.day, { down: Number(d.down), degraded: Number(d.degraded), total: Number(d.total) })
    dailyOf.set(d.component, m)
  }

  const dayKeys = last90Days()

  const components: StatusComponentOut[] = COMPONENTS.map((c) => {
    const days: DayPoint[] = []
    let up = 0
    let total = 0
    const perDay = dailyOf.get(c.id)
    for (const date of dayKeys) {
      const agg = perDay?.get(date)
      if (!agg || agg.total === 0) {
        days.push({ date, state: 'none' })
        continue
      }
      total += agg.total
      up += agg.total - agg.down
      // Tek başarısız kontrol (5 dk) gün şeridini kırmızıya boyamaz:
      // ardışıklık bilinmediğinden eşik ikinci başarısız kontroldür.
      const state: ServiceState =
        agg.down >= 2 ? 'down' : agg.down === 1 || agg.degraded >= 1 ? 'degraded' : 'up'
      days.push({ date, state })
    }
    const current = latestOf.get(c.id)
    return {
      id: c.id,
      name: c.name,
      provider: c.provider,
      accent: c.accent,
      state: current?.state ?? 'none',
      uptime: total > 0 ? (up / total) * 100 : null,
      days,
    }
  })

  const providers = PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    note: p.note,
    url: p.url,
    state: latestOf.get(`provider:${p.id}`)?.state ?? ('none' as ServiceState),
  }))

  // Genel durum: bileşenlerin en kötüsü; hiç veri yoksa 'none'.
  const known = components.filter((c) => c.state !== 'none')
  const overallState: ServiceState =
    known.length === 0
      ? 'none'
      : known.reduce<ServiceState>((acc, c) => (WORST[c.state] > WORST[acc] ? c.state : acc), 'up')

  const checkedAt = latest.reduce<string | null>(
    (acc, l) => (acc === null || l.checked_at > acc ? l.checked_at : acc),
    null,
  )

  return {
    overall: { state: overallState, checkedAt },
    components,
    providers,
    incidents: incidents.map((i) => ({
      id: i.id,
      title: i.title,
      affected: i.affected.split(',').filter(Boolean),
      detail: i.detail,
      startedAt: i.started_at,
      resolvedAt: i.resolved_at,
    })),
  }
}

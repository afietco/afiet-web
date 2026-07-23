import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'

/**
 * Beta başvuru katmanı. Başvurular SEO/waitlist/analitik ile AYNI Neon'da,
 * landing'e ait kendi kendini kuran `beta_applications` tablosunda yaşar
 * (golang-migrate şemasından bağımsız). Yazma ucu `POST /api/beta/apply`,
 * okuma ucu `GET /api/admin/beta` (yalnız admin). DDL burada TEK kaynaktır.
 */
type Sql = NeonQueryFunction<false, false>

export function betaSql(event: H3Event): Sql | null {
  const url = useRuntimeConfig(event).databaseUrl
  return url ? neon(url) : null
}

let ensured = false
export async function ensureBetaTable(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS beta_applications (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      email text UNIQUE NOT NULL,
      platform text NOT NULL DEFAULT '',
      goals jsonb NOT NULL DEFAULT '[]'::jsonb,
      counting_feeling text NOT NULL DEFAULT '',
      apps_nutrition jsonb NOT NULL DEFAULT '[]'::jsonb,
      apps_activity jsonb NOT NULL DEFAULT '[]'::jsonb,
      apps_body jsonb NOT NULL DEFAULT '[]'::jsonb,
      apps_other text NOT NULL DEFAULT '',
      contact_channel text NOT NULL DEFAULT '',
      heard_from text NOT NULL DEFAULT '',
      consent boolean NOT NULL DEFAULT false,
      consent_at timestamptz,
      user_agent text NOT NULL DEFAULT '',
      source text NOT NULL DEFAULT 'beta',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  ensured = true
}

export type BetaApplication = {
  id: number
  email: string
  platform: string
  goals: string[]
  countingFeeling: string
  appsNutrition: string[]
  appsActivity: string[]
  appsBody: string[]
  appsOther: string
  contactChannel: string
  heardFrom: string
  consent: boolean
  consentAt: string | null
  createdAt: string
  updatedAt: string
}

export type Tally = { key: string; count: number }

export type BetaAdminPayload = {
  dbConnected: boolean
  total: number
  /** Toplamada kullanılan satır sayısı (kapak: en yeni CAP kayıt). */
  sampled: number
  summary: {
    platform: Tally[]
    consented: number
    last7d: number
    goals: Tally[]
    counting: Tally[]
    apps: { nutrition: Tally[]; activity: Tally[]; body: Tally[] }
    contact: Tally[]
    heard: Tally[]
  }
  items: BetaApplication[]
}

const CAP = 1000

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function tally(values: string[]): Tally[] {
  const map = new Map<string, number>()
  for (const v of values) {
    if (!v) continue
    map.set(v, (map.get(v) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, 'tr'))
}

function emptySummary(): BetaAdminPayload['summary'] {
  return {
    platform: [],
    consented: 0,
    last7d: 0,
    goals: [],
    counting: [],
    apps: { nutrition: [], activity: [], body: [] },
    contact: [],
    heard: [],
  }
}

/** Panel açılış verisi: başvuru listesi + toplu kırılımlar. */
export async function buildBetaAdminPayload(event: H3Event): Promise<BetaAdminPayload> {
  const sql = betaSql(event)
  if (!sql) {
    return { dbConnected: false, total: 0, sampled: 0, summary: emptySummary(), items: [] }
  }
  await ensureBetaTable(sql)

  const countRows = await sql`SELECT count(*)::int AS n FROM beta_applications`
  const total = Number(countRows[0]?.n ?? 0)

  const raw = await sql`
    SELECT id, email, platform, goals, counting_feeling,
           apps_nutrition, apps_activity, apps_body, apps_other,
           contact_channel, heard_from, consent, consent_at, created_at, updated_at
    FROM beta_applications
    ORDER BY created_at DESC
    LIMIT ${CAP}
  `

  const items: BetaApplication[] = raw.map((r) => ({
    id: Number(r.id),
    email: String(r.email),
    platform: String(r.platform ?? ''),
    goals: strArr(r.goals),
    countingFeeling: String(r.counting_feeling ?? ''),
    appsNutrition: strArr(r.apps_nutrition),
    appsActivity: strArr(r.apps_activity),
    appsBody: strArr(r.apps_body),
    appsOther: String(r.apps_other ?? ''),
    contactChannel: String(r.contact_channel ?? ''),
    heardFrom: String(r.heard_from ?? ''),
    consent: r.consent === true,
    consentAt: r.consent_at ? new Date(r.consent_at as string).toISOString() : null,
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  }))

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const summary: BetaAdminPayload['summary'] = {
    platform: tally(items.map((i) => i.platform || 'unknown')),
    consented: items.filter((i) => i.consent).length,
    last7d: items.filter((i) => new Date(i.createdAt).getTime() >= weekAgo).length,
    goals: tally(items.flatMap((i) => i.goals)),
    counting: tally(items.map((i) => i.countingFeeling)),
    apps: {
      nutrition: tally(items.flatMap((i) => i.appsNutrition)),
      activity: tally(items.flatMap((i) => i.appsActivity)),
      body: tally(items.flatMap((i) => i.appsBody)),
    },
    contact: tally(items.map((i) => i.contactChannel)),
    heard: tally(items.map((i) => i.heardFrom)),
  }

  return { dbConnected: true, total, sampled: items.length, summary, items }
}

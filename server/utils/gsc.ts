import type { H3Event } from 'h3'
import type { NeonQueryFunction } from '@neondatabase/serverless'
import { upsertGscDaily, upsertGscRow, type GscDimension } from './gscStore'
import {
  DISCOVER_DIMENSIONS,
  ensureDiscoverTables,
  markDiscoverSync,
  upsertDiscoverDailyMany,
  upsertDiscoverRows,
  type DiscoverRowInput,
  type GscDiscoverDimension,
} from './gscDiscoverStore'

/**
 * Google Search Console Search Analytics istemcisi. Bağımlılık YOK: servis
 * hesabı JWT'si Web Crypto ile imzalanır (gcsSign.ts deseni; repoda
 * @types/node yok, node:crypto kullanma).
 *
 * Akış: SA anahtarı (NUXT_GSC_SA_KEY, base64 JSON) → RS256 JWT →
 * oauth2.googleapis.com/token (jwt-bearer) → searchanalytics.query.
 * Kapsam salt okunur: webmasters.readonly. SA e-postası GSC mülküne
 * kullanıcı olarak elle eklenmiş olmalı (kod bunu yapamaz).
 *
 * Hata logunda gövde message'ı KISALTILIR ve token asla yazılmaz.
 */

export type ServiceAccount = { client_email: string; private_key: string }

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

let saCache: { raw: string; sa: ServiceAccount; key: CryptoKey | null } | null = null
let tokenCache: { token: string; expiresAt: number } | null = null

function base64ToBuffer(value: string): ArrayBuffer {
  const binary = atob(value)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return buffer
}

const b64url = (data: ArrayBuffer | string): string => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function gscServiceAccount(event: H3Event): ServiceAccount | null {
  const raw = String(useRuntimeConfig(event).gscSaKey ?? '').trim()
  if (!raw) return null
  if (saCache && saCache.raw === raw) return saCache.sa
  try {
    const json = raw.startsWith('{') ? raw : new TextDecoder().decode(base64ToBuffer(raw))
    const parsed = JSON.parse(json) as Partial<ServiceAccount>
    if (!parsed.client_email || !parsed.private_key) throw new Error('client_email/private_key yok')
    const sa = { client_email: parsed.client_email, private_key: parsed.private_key }
    saCache = { raw, sa, key: null }
    return sa
  } catch (err) {
    console.error('[gsc] NUXT_GSC_SA_KEY okunamadı:', err instanceof Error ? err.message : err)
    return null
  }
}

export function gscProperty(event: H3Event): string {
  return String(useRuntimeConfig(event).gscProperty ?? '').trim()
}

async function signingKey(sa: ServiceAccount): Promise<CryptoKey> {
  if (saCache && saCache.sa === sa && saCache.key) return saCache.key
  const body = sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')
  const key = await crypto.subtle.importKey(
    'pkcs8',
    base64ToBuffer(body),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  if (saCache && saCache.sa === sa) saCache.key = key
  return key
}

/**
 * Dışa açık, çünkü URL Inspection istemcisi (gscIndex.ts) AYNI servis hesabını
 * ve AYNI kapsamı kullanır. İkinci bir token akışı yazmak, anahtarın ikinci bir
 * kopyasını ve sessizce ayrışabilecek ikinci bir önbelleği doğururdu.
 */
export async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (tokenCache && tokenCache.expiresAt - 60 > now) return tokenCache.token

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }))
  const unsigned = `${header}.${claims}`
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', await signingKey(sa), new TextEncoder().encode(unsigned))
  const assertion = `${unsigned}.${b64url(signature)}`

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!response.ok) throw new Error(`token değişimi ${response.status}`)
  const body = (await response.json()) as { access_token: string; expires_in?: number }
  tokenCache = { token: body.access_token, expiresAt: now + (body.expires_in ?? 3600) }
  return body.access_token
}

type QueryRow = { keys?: string[]; clicks?: number; impressions?: number; position?: number }

async function searchAnalytics(
  token: string,
  property: string,
  body: Record<string, unknown>,
): Promise<QueryRow[]> {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    let reason = ''
    try {
      const err = (await response.json()) as { error?: { status?: string; errors?: { reason?: string }[] } }
      reason = err.error?.status ?? err.error?.errors?.[0]?.reason ?? ''
    } catch { /* gövde yok */ }
    throw new Error(`searchanalytics ${response.status}${reason ? ` (${reason})` : ''}`)
  }
  const payload = (await response.json()) as { rows?: QueryRow[] }
  return payload.rows ?? []
}

export type GscSyncSummary = { startDate: string; endDate: string; days: number; queryRows: number; pageRows: number }

/** UTC bugünden `offset` gün geriye, YYYY-MM-DD. GSC tarihleri gün hassasiyetlidir. */
function dayAgo(offset: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - offset)
  return d.toISOString().slice(0, 10)
}

/**
 * Kayan pencere senkronu: GSC verisi ~2 gün geriden gelir, o yüzden pencere
 * her gün yeniden çekilip upsert edilir (dataState:'all' taze/kısmi veriyi de
 * getirir; ertesi günkü koşu kesinleşmiş sayıyla üzerine yazar).
 */
export async function syncGsc(
  event: H3Event,
  sql: NeonQueryFunction<false, false>,
  windowDays: number,
): Promise<GscSyncSummary> {
  const sa = gscServiceAccount(event)
  const property = gscProperty(event)
  if (!sa || !property) throw createError({ statusCode: 503, statusMessage: 'gsc_yapilandirilmadi' })

  const token = await accessToken(sa)
  const startDate = dayAgo(windowDays)
  const endDate = dayAgo(1)
  const base = { startDate, endDate, dataState: 'all' }

  const daily = await searchAnalytics(token, property, { ...base, dimensions: ['date'], rowLimit: 1000 })
  let days = 0
  for (const row of daily) {
    const date = row.keys?.[0]
    if (!date) continue
    await upsertGscDaily(sql, date, row.clicks ?? 0, row.impressions ?? 0, row.position ?? 0)
    days += 1
  }

  const syncDim = async (dimension: GscDimension): Promise<number> => {
    const rows = await searchAnalytics(token, property, { ...base, dimensions: ['date', dimension], rowLimit: 5000 })
    let written = 0
    for (const row of rows) {
      const [date, key] = row.keys ?? []
      if (!date || !key) continue
      await upsertGscRow(sql, date, dimension, key, row.clicks ?? 0, row.impressions ?? 0, row.position ?? 0)
      written += 1
    }
    return written
  }

  return {
    startDate,
    endDate,
    days,
    queryRows: await syncDim('query'),
    pageRows: await syncDim('page'),
  }
}

export type GscDiscoverSyncSummary = {
  startDate: string
  endDate: string
  days: number
  dailyRows: number
  pageRows: number
  countryRows: number
  /**
   * Bu turda SIFIRDAN BÜYÜK bir Discover ölçümü geldi mi. Satır sayısı bu
   * soruyu cevaplamaz: API eşik altındaki mülke sıfır dolu satırlar döndürür
   * (gscDiscoverStore dosya başındaki nota bak).
   */
  measured: boolean
}

/**
 * Discover senkronu. Arama senkronuyla AYNI uç ve aynı servis hesabı, tek
 * farkı gövdedeki `type: 'discover'`.
 *
 * Boyutlar bilinçle sınırlı: Discover'da `query` boyutu YOKTUR (akış sorguya
 * değil ilgiye dayanır) ve istenirse API hata döner; `position` metriği de
 * dönmez, o yüzden hiçbir yere yazılmaz.
 *
 * VERİSİZ YANIT ARIZA DEĞİLDİR ve iki ayrı şekilde gelir (26 Ağu 2026'da
 * canlı mülke sorularak ölçüldü): günlük boyut sıfır dolu SATIRLAR döndürür,
 * sayfa/ülke boyutları ise gerçekten BOŞ döner. Her iki durumda da tur
 * işaretlenir (`markDiscoverSync`), çünkü "cron hiç koşmadı" ile "koştu, veri
 * yok" panelde ve raporda farklı cümlelerdir.
 */
export async function syncGscDiscover(
  event: H3Event,
  sql: NeonQueryFunction<false, false>,
  windowDays: number,
): Promise<GscDiscoverSyncSummary> {
  const sa = gscServiceAccount(event)
  const property = gscProperty(event)
  if (!sa || !property) throw createError({ statusCode: 503, statusMessage: 'gsc_yapilandirilmadi' })

  await ensureDiscoverTables(sql)
  const token = await accessToken(sa)
  const startDate = dayAgo(windowDays)
  const endDate = dayAgo(1)
  const base = { startDate, endDate, dataState: 'all', type: 'discover' }

  const daily = await searchAnalytics(token, property, { ...base, dimensions: ['date'], rowLimit: 1000 })
  const dailyRows = daily
    .map((row) => ({
      date: row.keys?.[0] ?? '',
      clicks: row.clicks ?? 0,
      impressions: row.impressions ?? 0,
    }))
    .filter((r) => r.date)
  if (dailyRows.length) await upsertDiscoverDailyMany(sql, dailyRows)

  const counts: Record<GscDiscoverDimension, number> = { page: 0, country: 0 }
  for (const dimension of DISCOVER_DIMENSIONS) {
    const rows = await searchAnalytics(token, property, {
      ...base,
      dimensions: ['date', dimension],
      rowLimit: 5000,
    })
    const input: DiscoverRowInput[] = []
    for (const row of rows) {
      const [date, key] = row.keys ?? []
      if (!date || !key) continue
      input.push({ date, dimension, key, clicks: row.clicks ?? 0, impressions: row.impressions ?? 0 })
    }
    if (input.length) await upsertDiscoverRows(sql, input)
    counts[dimension] = input.length
  }

  const total = dailyRows.length + counts.page + counts.country
  await markDiscoverSync(sql, total)

  return {
    startDate,
    endDate,
    days: dailyRows.length,
    dailyRows: dailyRows.length,
    pageRows: counts.page,
    countryRows: counts.country,
    measured: dailyRows.some((r) => r.impressions > 0 || r.clicks > 0),
  }
}

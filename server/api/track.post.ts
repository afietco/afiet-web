import {
  analyticsSql,
  channelFor,
  ensureAnalyticsTables,
  hostFromReferrer,
  insertEvent,
  isBot,
  parseUa,
  type EventRow,
} from '../utils/analyticsStore'

/**
 * Birinci-taraf analitik beacon'ı (public). `app/plugins/analytics.client.ts`
 * her sayfa görüntülemede (ve ayrılırken süre için) buraya yollar. Ziyaretçi ve
 * oturum httpOnly birinci-taraf çerezlerle (rastgele UUID) izlenir; IP saklanmaz.
 *
 * Sözleşme: analitik ASLA siteyi kırmaz — geçersiz gövde, bot, DB yokluğu ya da
 * herhangi bir hata sessizce 204 döner (sendBeacon yanıtı zaten yok sayılır).
 */

const VID = 'afiet_vid' // ziyaretçi (kalıcı, ~2 yıl)
const SID = 'afiet_sid' // oturum (30 dk kayan)
const SESSION_MAX_AGE = 60 * 30
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365 * 2

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const cap = (v: unknown, n: number): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s.slice(0, n) : null
}
const clampInt = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, Math.round(n)))
}
/** Yalnız yol (query/hash yok), tek '/' ile başlar, makul uzunlukta. */
const normalizePath = (v: unknown): string | null => {
  let p = typeof v === 'string' ? v.trim() : ''
  if (!p || !p.startsWith('/')) return null
  p = p.split('?')[0]!.split('#')[0]!
  if (p.length > 1) p = p.replace(/\/+$/, '') || '/'
  return p.slice(0, 512)
}

export default defineEventHandler(async (event) => {
  const done = () => {
    setResponseStatus(event, 204)
    return null
  }
  try {
    const ua = getHeader(event, 'user-agent') || ''
    if (isBot(ua)) return done()

    const body = (await readBody(event).catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== 'object') return done()

    const path = normalizePath(body.p)
    if (!path) return done()

    const sql = analyticsSql(event)
    if (!sql) return done() // DB bağlı değil: sessiz geç
    await ensureAnalyticsTables(sql)

    // ── Birinci-taraf çerezler ──
    let vid = getCookie(event, VID) ?? ''
    let newVisitor = false
    if (!UUID_RE.test(vid)) {
      vid = crypto.randomUUID()
      newVisitor = true
    }
    let sid = getCookie(event, SID) ?? ''
    let entry = false
    if (!UUID_RE.test(sid)) {
      sid = crypto.randomUUID()
      entry = true
    }
    const secure = !import.meta.dev
    setCookie(event, VID, vid, { maxAge: VISITOR_MAX_AGE, httpOnly: true, sameSite: 'lax', secure, path: '/' })
    setCookie(event, SID, sid, { maxAge: SESSION_MAX_AGE, httpOnly: true, sameSite: 'lax', secure, path: '/' })

    const host = (getHeader(event, 'host') || '').toLowerCase().split(':')[0]!
    const ourHost = host.replace(/^www\./, '')
    const country = (getHeader(event, 'x-vercel-ip-country') || '').slice(0, 2).toUpperCase() || null

    // ── Süre (engagement) olayı: yalnız yol + süre ──
    if (body.e === 'eng') {
      await insertEvent(sql, blankRow({ event: 'engagement', visitorId: vid, sessionId: sid, host, path, durationMs: clampInt(body.d, 0, SESSION_MAX_AGE * 1000) }))
      return done()
    }

    // ── Sayfa görüntüleme ──
    const refHost = hostFromReferrer(String(body.r ?? ''))
    const utm = sanitizeUtm(body.u)
    const hasUtm = Boolean(utm.source || utm.medium || utm.campaign)
    // Edinim yalnız oturum girişinde anlamlı; oturum içi gezinme "internal".
    const channel = entry ? channelFor({ hasUtm, refHost, ourHost }) : 'internal'
    const { device, browser, os } = parseUa(ua)

    await insertEvent(sql, {
      event: 'pageview',
      visitorId: vid,
      sessionId: sid,
      isNewVisitor: newVisitor,
      isEntry: entry,
      host,
      path,
      title: cap(body.t, 300),
      referrerHost: entry ? refHost : ourHost,
      channel,
      utmSource: entry ? utm.source : null,
      utmMedium: entry ? utm.medium : null,
      utmCampaign: entry ? utm.campaign : null,
      utmTerm: entry ? utm.term : null,
      utmContent: entry ? utm.content : null,
      device,
      browser,
      os,
      country,
      durationMs: null,
      screenW: clampInt(body.w, 0, 20000),
    })
    return done()
  } catch {
    // Analitik asla siteyi kırmaz.
    return done()
  }
})

type Utm = { source: string | null; medium: string | null; campaign: string | null; term: string | null; content: string | null }
function sanitizeUtm(raw: unknown): Utm {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const pick = (k: string): string | null => {
    const v = o[k]
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : null
  }
  return { source: pick('source'), medium: pick('medium'), campaign: pick('campaign'), term: pick('term'), content: pick('content') }
}

/** Süre olayı için: zorunlu alanlar dolu, geri kalanı null. */
function blankRow(p: { event: 'engagement'; visitorId: string; sessionId: string; host: string; path: string; durationMs: number | null }): EventRow {
  return {
    event: p.event,
    visitorId: p.visitorId,
    sessionId: p.sessionId,
    isNewVisitor: false,
    isEntry: false,
    host: p.host,
    path: p.path,
    title: null,
    referrerHost: null,
    channel: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    device: null,
    browser: null,
    os: null,
    country: null,
    durationMs: p.durationMs,
    screenW: null,
  }
}

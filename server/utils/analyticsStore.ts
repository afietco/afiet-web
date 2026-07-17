import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'

/**
 * First-party web analitiği toplama katmanı. Beacon `POST /api/track`ten gelen
 * olayları SEO/waitlist/içerik ile AYNI Neon'da, landing'e ait kendi kendini
 * kuran `analytics_events` tablosuna yazar (golang-migrate şemasından bağımsız).
 * DB yoksa endpoint sessizce 204 döner — analitik hiçbir koşulda siteyi kırmaz.
 *
 * Tüm kayıt TOPLU/kohort düzeyindedir: IP saklanmaz; ziyaretçi/oturum birinci-
 * taraf çerezle (rastgele UUID) izlenir. Okuma tarafı FAZ 3'te
 * `GET /api/admin/analytics` ile eklenecek.
 */

type Sql = NeonQueryFunction<false, false>
let ensured = false

export function analyticsSql(event: H3Event): Sql | null {
  const url = useRuntimeConfig(event).databaseUrl
  return url ? neon(url) : null
}

export async function ensureAnalyticsTables(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ts timestamptz NOT NULL DEFAULT now(),
      event text NOT NULL DEFAULT 'pageview'
        CHECK (event IN ('pageview','engagement')),
      visitor_id uuid NOT NULL,
      session_id uuid NOT NULL,
      is_new_visitor boolean NOT NULL DEFAULT false,
      is_entry boolean NOT NULL DEFAULT false,
      host text NOT NULL DEFAULT '',
      path text NOT NULL,
      title text,
      referrer_host text,
      channel text,
      utm_source text,
      utm_medium text,
      utm_campaign text,
      utm_term text,
      utm_content text,
      device text,
      browser text,
      os text,
      country text,
      duration_ms integer,
      screen_w integer
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_ts_idx ON analytics_events (ts)`
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_path_idx ON analytics_events (path)`
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_visitor_idx ON analytics_events (visitor_id)`
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_event_idx ON analytics_events (event)`
  ensured = true
}

export type EventRow = {
  event: 'pageview' | 'engagement'
  visitorId: string
  sessionId: string
  isNewVisitor: boolean
  isEntry: boolean
  host: string
  path: string
  title: string | null
  referrerHost: string | null
  channel: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  device: string | null
  browser: string | null
  os: string | null
  country: string | null
  durationMs: number | null
  screenW: number | null
}

export async function insertEvent(sql: Sql, e: EventRow) {
  await sql`
    INSERT INTO analytics_events (
      event, visitor_id, session_id, is_new_visitor, is_entry, host, path, title,
      referrer_host, channel, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      device, browser, os, country, duration_ms, screen_w
    ) VALUES (
      ${e.event}, ${e.visitorId}, ${e.sessionId}, ${e.isNewVisitor}, ${e.isEntry}, ${e.host}, ${e.path}, ${e.title},
      ${e.referrerHost}, ${e.channel}, ${e.utmSource}, ${e.utmMedium}, ${e.utmCampaign}, ${e.utmTerm}, ${e.utmContent},
      ${e.device}, ${e.browser}, ${e.os}, ${e.country}, ${e.durationMs}, ${e.screenW}
    )
  `
}

// ── Saf yardımcılar (DB'siz, birim test edilebilir) ──────────────────────────

/** URL/host değerinden temiz hostname çıkar (www. atılır); geçersizse null. */
export function hostFromReferrer(ref: string): string | null {
  const raw = (ref || '').trim()
  if (!raw) return null
  try {
    const host = new URL(raw).hostname.toLowerCase()
    return host.replace(/^www\./, '') || null
  } catch {
    return null
  }
}

const SEARCH_HOSTS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'yandex.', 'baidu.', 'ecosia.', 'startpage.', 'qwant.', 'search.brave.']
const SOCIAL_HOSTS = ['instagram.com', 't.co', 'twitter.com', 'x.com', 'facebook.com', 'fb.com', 'm.facebook.com', 'lnkd.in', 'linkedin.com', 'youtube.com', 'youtu.be', 'reddit.com', 'pinterest.', 'tiktok.com', 'whatsapp.com', 'wa.me', 't.me', 'telegram.org']

const isSearchHost = (h: string) => SEARCH_HOSTS.some((s) => h.startsWith(s) || h.includes(`.${s}`) || h.includes(s))
const isSocialHost = (h: string) => SOCIAL_HOSTS.some((s) => h === s || h.endsWith(`.${s}`) || h.startsWith(s))

export function channelFor(opts: { hasUtm: boolean; refHost: string | null; ourHost: string }): string {
  if (opts.hasUtm) return 'campaign'
  if (!opts.refHost || opts.refHost === opts.ourHost) return 'direct'
  if (isSearchHost(opts.refHost)) return 'search'
  if (isSocialHost(opts.refHost)) return 'social'
  return 'referral'
}

/** Basit, bağımsız UA ayrıştırma — cihaz/tarayıcı/OS ailesi. */
export function parseUa(ua: string): { device: string; browser: string; os: string } {
  const u = ua || ''
  const isTablet = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(u)
  const isMobile = /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(u)
  const device = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop'

  let os = 'Diğer'
  if (/iPhone|iPad|iPod/i.test(u)) os = 'iOS'
  else if (/Android/i.test(u)) os = 'Android'
  else if (/Windows NT/i.test(u)) os = 'Windows'
  else if (/Mac OS X/i.test(u)) os = 'macOS'
  else if (/Linux/i.test(u)) os = 'Linux'

  let browser = 'Diğer'
  if (/Edg\//i.test(u)) browser = 'Edge'
  else if (/SamsungBrowser/i.test(u)) browser = 'Samsung Internet'
  else if (/OPR\/|Opera/i.test(u)) browser = 'Opera'
  else if (/Firefox\/|FxiOS/i.test(u)) browser = 'Firefox'
  else if (/CriOS/i.test(u) || (/Chrome\//i.test(u) && !/Edg\/|OPR\/|SamsungBrowser/i.test(u))) browser = 'Chrome'
  else if (/Safari/i.test(u) && !/Chrome\/|CriOS/i.test(u)) browser = 'Safari'

  return { device, browser, os }
}

/** Bot/crawler/uptime trafiğini eler (veri kalitesi). */
export function isBot(ua: string): boolean {
  return /bot|crawl|spider|slurp|headless|preview|monitor|lighthouse|pingdom|uptime|curl|wget|python-requests|axios|node-fetch|facebookexternalhit|embedly|vercel-screenshot|google-inspectiontool|bytespider|ahrefs|semrush/i.test(ua || '')
}

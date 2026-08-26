import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'

/**
 * First-party web analitiği toplama katmanı. Beacon `POST /api/track`ten gelen
 * olayları SEO/içerik ile AYNI Neon'da, landing'e ait kendi kendini
 * kuran `analytics_events` tablosuna yazar (golang-migrate şemasından bağımsız).
 * DB yoksa endpoint sessizce 204 döner - analitik hiçbir koşulda siteyi kırmaz.
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
        CHECK (event IN ('pageview','engagement','destek_oy','destek_arama','magaza_tik','bulten_kayit')),
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
      screen_w integer,
      click_kind text,
      click_id text
    )
  `
  // Reklam tıklama kimliği (Google gclid/gbraid/wbraid): yalnız oturum girişi
  // sayfa görüntülemesinde dolar; dönüşüm olayları (magaza_tik, bulten_kayit)
  // ziyaretçi üzerinden bu satıra bağlanıp Google Ads'e "offline conversion"
  // olarak elle yüklenir (bkz. api/admin/analytics/ads-conversions). Üçüncü
  // taraf script ya da çerez YOK; kimlik URL'den okunur, onay kapısından geçer.
  await sql`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS click_kind text`
  await sql`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS click_id text`
  // Tablo prod'da VERİYLE yaşıyor, CREATE TABLE IF NOT EXISTS yetmez: olay
  // kümesi büyüdüğünde adlandırılmış CHECK düşürülüp yeniden kurulur
  // (contentStore'daki şema büyütme kuralının aynısı). Düşürme+ekleme
  // idempotenttir, `ensured` bayrağı sayesinde süreç başına bir kez koşar.
  await sql`ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS analytics_events_event_check`
  await sql`
    ALTER TABLE analytics_events ADD CONSTRAINT analytics_events_event_check
      CHECK (event IN ('pageview','engagement','destek_oy','destek_arama','magaza_tik','bulten_kayit'))
  `
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_ts_idx ON analytics_events (ts)`
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_path_idx ON analytics_events (path)`
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_visitor_idx ON analytics_events (visitor_id)`
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_event_idx ON analytics_events (event)`
  await sql`CREATE INDEX IF NOT EXISTS analytics_events_click_idx ON analytics_events (visitor_id, ts) WHERE click_id IS NOT NULL`
  ensured = true
}

export type AnalyticsEvent = 'pageview' | 'engagement' | 'destek_oy' | 'destek_arama' | 'magaza_tik' | 'bulten_kayit'
export type ClickKind = 'gclid' | 'gbraid' | 'wbraid'

export type EventRow = {
  event: AnalyticsEvent
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
  clickKind?: ClickKind | null
  clickId?: string | null
}

export async function insertEvent(sql: Sql, e: EventRow) {
  await sql`
    INSERT INTO analytics_events (
      event, visitor_id, session_id, is_new_visitor, is_entry, host, path, title,
      referrer_host, channel, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      device, browser, os, country, duration_ms, screen_w, click_kind, click_id
    ) VALUES (
      ${e.event}, ${e.visitorId}, ${e.sessionId}, ${e.isNewVisitor}, ${e.isEntry}, ${e.host}, ${e.path}, ${e.title},
      ${e.referrerHost}, ${e.channel}, ${e.utmSource}, ${e.utmMedium}, ${e.utmCampaign}, ${e.utmTerm}, ${e.utmContent},
      ${e.device}, ${e.browser}, ${e.os}, ${e.country}, ${e.durationMs}, ${e.screenW}, ${e.clickKind ?? null}, ${e.clickId ?? null}
    )
  `
}

// ── Reklam tıklama kimliği ─────────────────────────────────────────────────

export const CLICK_KINDS: ClickKind[] = ['gclid', 'gbraid', 'wbraid']
/** Google'ın tıklama kimlikleri URL-güvenli base64 benzeri; 20-200 karakter arası kabul. */
const CLICK_ID_RE = /^[A-Za-z0-9_-]{10,200}$/

/**
 * Beacon gövdesindeki `g` alanını doğrular: `{ k: 'gclid'|'gbraid'|'wbraid', v: string }`.
 * Biçimi tutmayan her şey null (analitik asla siteyi kırmaz, kirli değer de saklamaz).
 */
export function sanitizeClick(raw: unknown): { kind: ClickKind; id: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const kind = typeof o.k === 'string' ? (o.k as ClickKind) : null
  const id = typeof o.v === 'string' ? o.v.trim() : ''
  if (!kind || !CLICK_KINDS.includes(kind)) return null
  if (!CLICK_ID_RE.test(id)) return null
  return { kind, id }
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

/**
 * Yapay zeka yanıt yüzeyleri. Referrer TAŞIYAN AI trafiği bu listeyle yakalanır.
 *
 * ⚠️ SIRA ÖNEMLİ: `channelFor` bu kontrolü aramadan ve sosyalden ÖNCE yapar.
 * `gemini.google.com` arama listesindeki `google.` desenine uyuyor,
 * `edgeservices.bing.com` de `bing.` desenine; sıra bozulursa Gemini ve
 * Copilot yönlendirmesi sessizce "arama" diye sayılır ve kör nokta geri gelir.
 *
 * Eşleşme tam host ya da alt alan adıdır (`chatgpt.com` ve `x.chatgpt.com`),
 * `includes` DEĞİL: `openai.com.kotu-site.net` eşleşmemeli.
 */
export const AI_HOSTS = [
  'chatgpt.com',
  'chat.openai.com',
  'openai.com',
  'perplexity.ai',
  'gemini.google.com',
  'bard.google.com',
  'claude.ai',
  'copilot.microsoft.com',
  'edgeservices.bing.com',
  'grok.com',
  'x.ai',
  'meta.ai',
  'you.com',
  'poe.com',
  'phind.com',
  'deepseek.com',
  'chat.mistral.ai',
]

const SEARCH_HOSTS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'yandex.', 'baidu.', 'ecosia.', 'startpage.', 'qwant.', 'search.brave.']
const SOCIAL_HOSTS = ['instagram.com', 't.co', 'twitter.com', 'x.com', 'facebook.com', 'fb.com', 'm.facebook.com', 'lnkd.in', 'linkedin.com', 'youtube.com', 'youtu.be', 'reddit.com', 'pinterest.', 'tiktok.com', 'whatsapp.com', 'wa.me', 't.me', 'telegram.org']

const isSearchHost = (h: string) => SEARCH_HOSTS.some((s) => h.startsWith(s) || h.includes(`.${s}`) || h.includes(s))
const isSocialHost = (h: string) => SOCIAL_HOSTS.some((s) => h === s || h.endsWith(`.${s}`) || h.startsWith(s))
export const isAiHost = (h: string) => AI_HOSTS.some((s) => h === s || h.endsWith(`.${s}`))

export function channelFor(opts: { hasUtm: boolean; refHost: string | null; ourHost: string }): string {
  // UTM kampanyayı YENER, bu davranış bilerek korundu: reklam ölçümü
  // etiketli bağlantıya dayanıyor ve bir AI yüzeyinden gelen etiketli
  // bağlantı da bir kampanya tıklamasıdır.
  if (opts.hasUtm) return 'campaign'
  if (!opts.refHost || opts.refHost === opts.ourHost) return 'direct'
  if (isAiHost(opts.refHost)) return 'ai'
  if (isSearchHost(opts.refHost)) return 'search'
  if (isSocialHost(opts.refHost)) return 'social'
  return 'referral'
}

/**
 * "Muhtemel AI" sezgiseli - GENİŞ tanım (kullanıcı kararı, 26 Ağu 2026).
 *
 * NEDEN VAR: AI kaynaklı oturumların büyük kısmı referrer TAŞIMADAN geliyor
 * (yerel uygulamalar, gizlilik ayarları) ve `direct` kovasına düşüyor. Bu
 * yüzden sadece referrer'a bakan bir ölçüm en iyi kanalı sistematik olarak
 * eksik sayar.
 *
 * NE DEĞİL: bu bir kanal DEĞİLDİR ve `channel` kolonuna YAZILMAZ. Kanal
 * tablosu ölçülen gerçeği gösterir, bu sayı yanında ayrı bir sinyal olarak
 * durur. Sezgiselle üretilmiş bir sayıyı kanal tablosuna karıştırmak, sonradan
 * gerçek AI yönlendirmesi gelmeye başladığında ikisini ayırmayı imkânsız
 * kılardı.
 *
 * KURAL: referrer yok (kanal `direct`) + oturum girişi + YENİ ziyaretçi +
 * ana sayfa değil + işlemsel yol değil.
 *
 * Yanlış pozitifler bilerek kabul edildi: yer imi, elle yazılan adres ve QR
 * trafiği de bu kovaya düşer. Dar tanım (yalnız derin içerik yolları)
 * değerlendirildi ve reddedildi; bu sayı mutlak bir ölçüm değil, TREND
 * göstergesidir ve öyle etiketlenir.
 *
 * ⚠️ AYNA: aynı kural `analyticsReport.ts > aggregateAnalytics` içinde SQL
 * olarak da yazılıdır (okuma tarafı satırları TS'e çekmez). İkisi BİRLİKTE
 * değişir. Dışlanan yol listesi tek kaynaktır ve SQL'e parametre olarak
 * geçer, o yüzden orada kopyası yoktur.
 */
export const AI_GUESS_EXCLUDED_PREFIXES = [
  '/e-posta-dogrula',
  '/sifre-yenile',
  '/bulten/onay',
  '/bulten/cik',
  '/katil',
]

export function isLikelyAiEntry(o: {
  channel: string | null
  isEntry: boolean
  isNewVisitor: boolean
  path: string
}): boolean {
  if (!o.isEntry || !o.isNewVisitor) return false
  if (o.channel !== 'direct') return false
  if (o.path === '/') return false
  return !AI_GUESS_EXCLUDED_PREFIXES.some((p) => o.path === p || o.path.startsWith(`${p}/`))
}

/** Basit, bağımsız UA ayrıştırma - cihaz/tarayıcı/OS ailesi. */
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

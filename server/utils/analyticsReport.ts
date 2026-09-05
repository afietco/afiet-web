import type { Sql } from './db'
import { AI_GUESS_EXCLUDED_PREFIXES } from './analyticsStore'

/**
 * Web analitiği okuma/aggregate tarafı. `analytics_events`ten TOPLU (kohort)
 * metrikler üretir; çıktı afiet-admin `src/services/analytics.ts` içindeki
 * `AnalyticsData` tipiyle BİREBİR aynıdır (panel doğrudan render eder).
 * Kişi-bazlı satır dönmez.
 */

export type Range = '7d' | '30d' | '90d'
const DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90 }
export const parseRange = (v: unknown): Range => (v === '7d' || v === '90d' ? v : '30d')

type SeriesPoint = { date: string; views: number; visitors: number }
type PageRow = { path: string; title: string; views: number; visitors: number; avgSeconds: number }
type BlogRow = { slug: string; title: string; views: number; visitors: number; avgReadSeconds: number; publishedAt: string | null }
type ChannelRow = { key: string; label: string; visits: number }
type SourceRow = { source: string; visits: number }
type UtmRow = { value: string; visits: number }
type BreakdownRow = { key: string; label: string; visits: number }
/** utm_content (kreatif) satırı: ziyaret + o kreatiften gelen ziyaretçilerin web dönüşümleri. */
type ContentRow = { value: string; visits: number; magaza: number; bulten: number }
/** Web dönüşümleri: mağaza tıklaması (mağazaya göre) ve bülten kaydı; reklam tıklama kimliğiyle eşlenen pay. */
type WebConversions = { magazaPlay: number; magazaAppstore: number; bulten: number; withClickId: number }

/**
 * Yapay zeka trafiği. İKİ SAYI AYRI DURUR ve toplanmaz:
 *
 * `referred` ÖLÇÜLEN gerçektir: referrer'ı bir AI yüzeyi olan girişler
 * (`channel='ai'`). Kanal tablosundaki "Yapay zeka" satırıyla aynı sayıdır.
 *
 * `likely` bir SEZGİSELDİR: referrer taşımayan yeni ziyaretçinin ana sayfa
 * dışına inişi. Yer imi, elle yazılan adres ve QR trafiği de buraya düşer.
 * Mutlak bir ölçüm değil TREND göstergesidir ve panelde öyle etiketlenir.
 * Kanal tablosuna KARIŞMAZ (kullanıcı kararı, 26 Ağu 2026).
 */
type AiTraffic = {
  referred: number
  sources: SourceRow[]
  likely: number
  directEntries: number
  likelyOfDirect: number
}

export type AnalyticsData = {
  generatedAt: string
  live: boolean
  range: Range
  totals: {
    views: number
    visitors: number
    viewsPerVisit: number
    avgDuration: number
    /**
     * İki dönüşüm AYRI durur (kullanıcı kararı, 25 Ağu 2026). Beta başvurusu
     * emekli olunca tek bir "conversions" alanı kalmıştı ve o alan bugünden
     * sonra sonsuza kadar 0 okuyacaktı.
     *
     * Mağaza tıklaması ürünün asıl dönüşümüdür ve Google Ads'e elle yüklenen
     * web dönüşümünün kaynağıdır, AMA çerez onayı kapısının arkasındadır:
     * onayı reddeden ziyaretçi hiç sayılmaz, yani gerçek sayı bundan yüksektir.
     * Bülten kaydı sunucu tarafında düştüğü için onaya BAĞLI DEĞİLDİR ve
     * ücretli trafiğin daha güvenilir sayacıdır. İkisini tek sayıya toplamak
     * bu farkı gizlerdi.
     */
    storeClicks: number
    storeClickRate: number
    newsletter: number
    newsletterRate: number
    deltaViews: number
    deltaVisitors: number
  }
  series: SeriesPoint[]
  topPages: PageRow[]
  blog: BlogRow[]
  channels: ChannelRow[]
  referrers: SourceRow[]
  utm: { source: UtmRow[]; medium: UtmRow[]; campaign: UtmRow[]; term: UtmRow[]; content: ContentRow[] }
  webConversions: WebConversions
  aiTraffic: AiTraffic
  devices: BreakdownRow[]
  browsers: BreakdownRow[]
  countries: BreakdownRow[]
}

const CHANNEL_LABEL: Record<string, string> = {
  search: 'Arama', ai: 'Yapay zeka', direct: 'Doğrudan', social: 'Sosyal', referral: 'Diğer siteler', campaign: 'Kampanya (UTM)',
}
const CHANNEL_ORDER = ['search', 'ai', 'direct', 'social', 'referral', 'campaign']
const DEVICE_LABEL: Record<string, string> = { mobile: 'Mobil', desktop: 'Masaüstü', tablet: 'Tablet' }
const STATIC_TITLE: Record<string, string> = { '/': 'Ana sayfa', '/blog': 'Blog', '/gizlilik': 'Gizlilik', '/hesap-sil': 'Hesap sil' }
const COUNTRY_LABEL: Record<string, string> = {
  TR: 'Türkiye', DE: 'Almanya', US: 'ABD', NL: 'Hollanda', GB: 'Birleşik Krallık', FR: 'Fransa',
  AZ: 'Azerbaycan', AT: 'Avusturya', BE: 'Belçika', CH: 'İsviçre', SE: 'İsveç', IT: 'İtalya',
  ES: 'İspanya', CA: 'Kanada', AU: 'Avustralya', SA: 'Suudi Arabistan', AE: 'BAE',
}

const pct = (n: number, base: number) => (base > 0 ? Math.round((n / base) * 100) : 0)
const round2 = (n: number) => Math.round(n * 100) / 100

/** YYYY-MM-DD listesi: start (days-1 gün önce) → bugün. */
function dayKeys(days: number): string[] {
  const out: string[] = []
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const x = new Date(d)
    x.setUTCDate(d.getUTCDate() - i)
    out.push(x.toISOString().slice(0, 10))
  }
  return out
}

export async function aggregateAnalytics(sql: Sql, domains: string[], range: Range): Promise<AnalyticsData> {
  const days = DAYS[range]
  const ourHosts = domains.map((h) => h.replace(/^www\./, ''))
  // Yol öneki listesini LIKE kalıplarına çevir: tam eşleşme ya da alt yol.
  // Öneklerde LIKE joker karakteri (% _) YOK, o yüzden kaçış gerekmiyor;
  // listeye joker taşıyan bir yol eklenirse burası da düşünülmeli.
  const aiGuessExcludedLike = AI_GUESS_EXCLUDED_PREFIXES.flatMap((x) => [x, `${x}/%`])

  const [
    totalsRows, prevRows, seriesRows, pagesRows, durRows,
    channelRows, referrerRows, utmSrcRows, utmMedRows, utmCampRows,
    deviceRows, browserRows, countryRows, blogTitleRows, convRows,
    utmTermRows, utmContentRows, webConvRows, aiSourceRows, aiRows,
  ] = await Promise.all([
    sql`SELECT
          count(*) FILTER (WHERE event='pageview')::int AS views,
          count(DISTINCT visitor_id) FILTER (WHERE event='pageview')::int AS visitors,
          count(DISTINCT session_id) FILTER (WHERE event='pageview')::int AS sessions,
          coalesce(avg(duration_ms) FILTER (WHERE event='engagement'), 0)::float AS avg_ms
        FROM analytics_events
        WHERE host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})`,
    sql`SELECT
          count(*) FILTER (WHERE event='pageview')::int AS views,
          count(DISTINCT visitor_id) FILTER (WHERE event='pageview')::int AS visitors
        FROM analytics_events
        WHERE host = ANY(${domains})
          AND ts >= now() - make_interval(days => ${days * 2})
          AND ts <  now() - make_interval(days => ${days})`,
    sql`SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS d,
               count(*)::int AS views, count(DISTINCT visitor_id)::int AS visitors
        FROM analytics_events
        WHERE event='pageview' AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY 1 ORDER BY 1`,
    sql`SELECT path, count(*)::int AS views, count(DISTINCT visitor_id)::int AS visitors
        FROM analytics_events
        WHERE event='pageview' AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY path ORDER BY views DESC LIMIT 15`,
    sql`SELECT path, coalesce(avg(duration_ms), 0)::float AS ms
        FROM analytics_events
        WHERE event='engagement' AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY path`,
    sql`SELECT channel, count(*)::int AS visits
        FROM analytics_events
        WHERE event='pageview' AND is_entry AND channel IS NOT NULL AND channel <> 'internal'
          AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY channel`,
    sql`SELECT referrer_host AS source, count(*)::int AS visits
        FROM analytics_events
        WHERE event='pageview' AND is_entry AND referrer_host IS NOT NULL AND NOT (referrer_host = ANY(${ourHosts}))
          AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY referrer_host ORDER BY visits DESC LIMIT 8`,
    sql`SELECT utm_source AS value, count(*)::int AS visits
        FROM analytics_events
        WHERE event='pageview' AND is_entry AND utm_source IS NOT NULL
          AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY utm_source ORDER BY visits DESC LIMIT 6`,
    sql`SELECT utm_medium AS value, count(*)::int AS visits
        FROM analytics_events
        WHERE event='pageview' AND is_entry AND utm_medium IS NOT NULL
          AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY utm_medium ORDER BY visits DESC LIMIT 6`,
    sql`SELECT utm_campaign AS value, count(*)::int AS visits
        FROM analytics_events
        WHERE event='pageview' AND is_entry AND utm_campaign IS NOT NULL
          AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY utm_campaign ORDER BY visits DESC LIMIT 6`,
    sql`SELECT device AS key, count(DISTINCT session_id)::int AS visits
        FROM analytics_events
        WHERE event='pageview' AND device IS NOT NULL AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY device ORDER BY visits DESC`,
    sql`SELECT browser AS key, count(DISTINCT session_id)::int AS visits
        FROM analytics_events
        WHERE event='pageview' AND browser IS NOT NULL AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY browser ORDER BY visits DESC LIMIT 8`,
    sql`SELECT country AS key, count(DISTINCT session_id)::int AS visits
        FROM analytics_events
        WHERE event='pageview' AND country IS NOT NULL AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY country ORDER BY visits DESC LIMIT 12`,
    sql`SELECT slug, title, to_char(published_at, 'YYYY-MM-DD') AS published_at FROM blog_posts`.catch(() => [] as Record<string, unknown>[]),
    sql`SELECT
          count(*) FILTER (WHERE event='magaza_tik')::int AS magaza,
          count(*) FILTER (WHERE event='bulten_kayit')::int AS bulten
        FROM analytics_events
        WHERE event IN ('magaza_tik','bulten_kayit')
          AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})`,
    sql`SELECT utm_term AS value, count(*)::int AS visits
        FROM analytics_events
        WHERE event='pageview' AND is_entry AND utm_term IS NOT NULL
          AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY utm_term ORDER BY visits DESC LIMIT 8`,
    // Kreatif kırılımı (utm_content): girişteki kreatif + aynı ziyaretçinin
    // aralık içindeki web dönüşümleri. Dönüşüm, ziyaretçinin o aralıktaki
    // SON kreatif girişine yazılır (basit "son tıklama"); reklam kanalları da
    // varsayılan olarak öyle sayar, karşılaştırma bu yüzden anlamlı.
    sql`WITH giris AS (
          SELECT DISTINCT ON (visitor_id) visitor_id, utm_content
          FROM analytics_events
          WHERE event='pageview' AND is_entry AND utm_content IS NOT NULL
            AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
          ORDER BY visitor_id, ts DESC
        ),
        donusum AS (
          SELECT visitor_id,
                 count(*) FILTER (WHERE event='magaza_tik')::int AS magaza,
                 count(*) FILTER (WHERE event='bulten_kayit')::int AS bulten
          FROM analytics_events
          WHERE event IN ('magaza_tik','bulten_kayit')
            AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
          GROUP BY visitor_id
        ),
        ziyaret AS (
          SELECT utm_content AS value, count(*)::int AS visits
          FROM analytics_events
          WHERE event='pageview' AND is_entry AND utm_content IS NOT NULL
            AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
          GROUP BY utm_content
        )
        SELECT z.value, z.visits,
               coalesce(sum(d.magaza), 0)::int AS magaza,
               coalesce(sum(d.bulten), 0)::int AS bulten
        FROM ziyaret z
        LEFT JOIN giris g ON g.utm_content = z.value
        LEFT JOIN donusum d ON d.visitor_id = g.visitor_id
        GROUP BY z.value, z.visits
        ORDER BY z.visits DESC LIMIT 12`,
    sql`SELECT
          count(*) FILTER (WHERE e.event='magaza_tik' AND e.title='play')::int AS magaza_play,
          count(*) FILTER (WHERE e.event='magaza_tik' AND e.title='appstore')::int AS magaza_appstore,
          count(*) FILTER (WHERE e.event='bulten_kayit')::int AS bulten,
          count(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM analytics_events c
            WHERE c.visitor_id = e.visitor_id AND c.click_id IS NOT NULL
              AND c.ts <= e.ts AND c.ts >= e.ts - interval '90 days'
          ))::int AS with_click_id
        FROM analytics_events e
        WHERE e.event IN ('magaza_tik','bulten_kayit')
          AND e.host = ANY(${domains}) AND e.ts >= now() - make_interval(days => ${days})`,
    // Hangi AI yüzeyinden geldi (ÖLÇÜLEN, referrer'lı).
    sql`SELECT referrer_host AS source, count(*)::int AS visits
        FROM analytics_events
        WHERE event='pageview' AND is_entry AND channel='ai' AND referrer_host IS NOT NULL
          AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})
        GROUP BY referrer_host ORDER BY visits DESC LIMIT 8`,
    // AI toplamı + "muhtemel AI" sezgiseli + karşılaştırma tabanı, tek turda.
    // ⚠️ AYNA: sezgiselin kuralı `analyticsStore.ts > isLikelyAiEntry` içinde
    // TS olarak da yazılıdır (birim testi orada koşar) ve ikisi BİRLİKTE
    // değişir. Dışlanan yol listesi tek kaynaktır, buraya parametre gelir.
    sql`SELECT
          count(*) FILTER (WHERE channel='ai')::int AS referred,
          count(*) FILTER (WHERE channel='direct')::int AS direct_entries,
          count(*) FILTER (
            WHERE channel='direct' AND is_new_visitor AND path <> '/'
              AND NOT (path LIKE ANY(${aiGuessExcludedLike}))
          )::int AS likely
        FROM analytics_events
        WHERE event='pageview' AND is_entry
          AND host = ANY(${domains}) AND ts >= now() - make_interval(days => ${days})`,
  ])

  const t = (totalsRows[0] ?? {}) as { views?: number; visitors?: number; sessions?: number; avg_ms?: number }
  const prev = (prevRows[0] ?? {}) as { views?: number; visitors?: number }
  const views = t.views ?? 0
  const visitors = t.visitors ?? 0
  const sessions = t.sessions ?? 0
  const conv = (convRows[0] ?? {}) as { magaza?: number; bulten?: number }
  const storeClicks = Number(conv.magaza ?? 0)
  const newsletter = Number(conv.bulten ?? 0)
  const oran = (n: number) => (visitors > 0 ? Math.round((n / visitors) * 1000) / 10 : 0)

  const durByPath = new Map<string, number>()
  for (const r of durRows as unknown as { path: string; ms: number }[]) durByPath.set(r.path, r.ms)

  const blogTitle = new Map<string, { title: string; publishedAt: string | null }>()
  for (const r of blogTitleRows as unknown as { slug: string; title: string; published_at: string | null }[]) {
    blogTitle.set(r.slug, { title: r.title, publishedAt: r.published_at })
  }
  const titleFor = (path: string): string => {
    if (STATIC_TITLE[path]) return STATIC_TITLE[path]!
    if (path.startsWith('/blog/')) return blogTitle.get(path.slice('/blog/'.length))?.title ?? path
    return path
  }

  // Seri: eksik günleri 0'la
  const seriesMap = new Map<string, { views: number; visitors: number }>()
  for (const r of seriesRows as unknown as { d: string; views: number; visitors: number }[]) seriesMap.set(r.d, { views: r.views, visitors: r.visitors })
  const series: SeriesPoint[] = dayKeys(days).map((date) => ({ date, views: seriesMap.get(date)?.views ?? 0, visitors: seriesMap.get(date)?.visitors ?? 0 }))

  const topPages: PageRow[] = (pagesRows as unknown as { path: string; views: number; visitors: number }[]).map((r) => ({
    path: r.path, title: titleFor(r.path), views: r.views, visitors: r.visitors, avgSeconds: Math.round((durByPath.get(r.path) ?? 0) / 1000),
  }))

  const blog: BlogRow[] = (pagesRows as unknown as { path: string; views: number; visitors: number }[])
    .filter((r) => r.path.startsWith('/blog/'))
    .map((r) => {
      const slug = r.path.slice('/blog/'.length)
      const meta = blogTitle.get(slug)
      return {
        slug,
        title: meta?.title ?? slug,
        views: r.views,
        visitors: r.visitors,
        avgReadSeconds: Math.round((durByPath.get(r.path) ?? 0) / 1000),
        publishedAt: meta?.publishedAt ?? null,
      }
    })

  // `ai` satırı SIFIRKEN DE gösterilir. Burada sıfır bir ölçüm SONUCUDUR
  // ("henüz hiçbir yapay zeka yüzeyinden yönlendirme almadık"); satırın hiç
  // olmaması ise "bu ölçülmüyor" diye okunur ve tam da kapatmaya çalıştığımız
  // kör noktayı geri getirir. Diğer kanallar bu muameleyi görmez: onların
  // sıfırı bir haber değil.
  const channelVisits = new Map<string, number>()
  for (const r of channelRows as unknown as { channel: string; visits: number }[]) channelVisits.set(r.channel, r.visits)
  if (!channelVisits.has('ai')) channelVisits.set('ai', 0)
  const channels: ChannelRow[] = [...channelVisits.entries()]
    .map(([key, visits]) => ({ key, label: CHANNEL_LABEL[key] ?? key, visits }))
    .sort((a, b) => CHANNEL_ORDER.indexOf(a.key) - CHANNEL_ORDER.indexOf(b.key))

  const referrers: SourceRow[] = (referrerRows as unknown as { source: string; visits: number }[]).map((r) => ({ source: r.source, visits: r.visits }))

  const utmMap = (rows: unknown[]): UtmRow[] => (rows as unknown as { value: string; visits: number }[]).map((r) => ({ value: r.value, visits: r.visits }))
  const contentRows: ContentRow[] = (utmContentRows as unknown as { value: string; visits: number; magaza: number; bulten: number }[])
    .map((r) => ({ value: r.value, visits: r.visits, magaza: r.magaza, bulten: r.bulten }))
  const wc = (webConvRows[0] ?? {}) as { magaza_play?: number; magaza_appstore?: number; bulten?: number; with_click_id?: number }
  const webConversions: WebConversions = {
    magazaPlay: wc.magaza_play ?? 0,
    magazaAppstore: wc.magaza_appstore ?? 0,
    bulten: wc.bulten ?? 0,
    withClickId: wc.with_click_id ?? 0,
  }

  const ai = (aiRows[0] ?? {}) as { referred?: number; direct_entries?: number; likely?: number }
  const aiDirectEntries = ai.direct_entries ?? 0
  const aiLikely = ai.likely ?? 0
  const aiTraffic: AiTraffic = {
    referred: ai.referred ?? 0,
    sources: (aiSourceRows as unknown as { source: string; visits: number }[]).map((r) => ({ source: r.source, visits: r.visits })),
    likely: aiLikely,
    directEntries: aiDirectEntries,
    likelyOfDirect: pct(aiLikely, aiDirectEntries),
  }

  const devices: BreakdownRow[] = (deviceRows as unknown as { key: string; visits: number }[]).map((r) => ({ key: r.key, label: DEVICE_LABEL[r.key] ?? r.key, visits: r.visits }))
  const browsers: BreakdownRow[] = (browserRows as unknown as { key: string; visits: number }[]).map((r) => ({ key: r.key, label: r.key, visits: r.visits }))
  const countries: BreakdownRow[] = (countryRows as unknown as { key: string; visits: number }[]).map((r) => ({ key: r.key, label: COUNTRY_LABEL[r.key] ?? r.key, visits: r.visits }))

  return {
    generatedAt: new Date().toISOString(),
    live: true,
    range,
    totals: {
      views,
      visitors,
      viewsPerVisit: round2(sessions > 0 ? views / sessions : 0),
      avgDuration: Math.round(t.avg_ms ?? 0) / 1000,
      storeClicks,
      storeClickRate: oran(storeClicks),
      newsletter,
      newsletterRate: oran(newsletter),
      deltaViews: pct(views - (prev.views ?? 0), prev.views ?? 0),
      deltaVisitors: pct(visitors - (prev.visitors ?? 0), prev.visitors ?? 0),
    },
    series,
    topPages,
    blog,
    channels,
    referrers,
    utm: { source: utmMap(utmSrcRows), medium: utmMap(utmMedRows), campaign: utmMap(utmCampRows), term: utmMap(utmTermRows), content: contentRows },
    webConversions,
    aiTraffic,
    devices,
    browsers,
    countries,
  }
}

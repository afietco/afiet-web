import type { NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Web analitiği okuma/aggregate tarafı. `analytics_events`ten TOPLU (kohort)
 * metrikler üretir; çıktı afiet-admin `src/services/analytics.ts` içindeki
 * `AnalyticsData` tipiyle BİREBİR aynıdır (panel doğrudan render eder).
 * Kişi-bazlı satır dönmez.
 */

type Sql = NeonQueryFunction<false, false>
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

export type AnalyticsData = {
  generatedAt: string
  live: boolean
  range: Range
  totals: {
    views: number
    visitors: number
    viewsPerVisit: number
    avgDuration: number
    conversions: number
    conversionRate: number
    deltaViews: number
    deltaVisitors: number
  }
  series: SeriesPoint[]
  topPages: PageRow[]
  blog: BlogRow[]
  channels: ChannelRow[]
  referrers: SourceRow[]
  utm: { source: UtmRow[]; medium: UtmRow[]; campaign: UtmRow[] }
  devices: BreakdownRow[]
  browsers: BreakdownRow[]
  countries: BreakdownRow[]
}

const CHANNEL_LABEL: Record<string, string> = {
  search: 'Arama', direct: 'Doğrudan', social: 'Sosyal', referral: 'Diğer siteler', campaign: 'Kampanya (UTM)',
}
const CHANNEL_ORDER = ['search', 'direct', 'social', 'referral', 'campaign']
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

  const [
    totalsRows, prevRows, seriesRows, pagesRows, durRows,
    channelRows, referrerRows, utmSrcRows, utmMedRows, utmCampRows,
    deviceRows, browserRows, countryRows, blogTitleRows, convRows,
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
    sql`SELECT count(*)::int AS n FROM waitlist WHERE created_at >= now() - make_interval(days => ${days})`.catch(() => [{ n: 0 }] as Record<string, unknown>[]),
  ])

  const t = (totalsRows[0] ?? {}) as { views?: number; visitors?: number; sessions?: number; avg_ms?: number }
  const prev = (prevRows[0] ?? {}) as { views?: number; visitors?: number }
  const views = t.views ?? 0
  const visitors = t.visitors ?? 0
  const sessions = t.sessions ?? 0
  const conversions = Number((convRows[0] as { n?: number } | undefined)?.n ?? 0)

  const durByPath = new Map<string, number>()
  for (const r of durRows as { path: string; ms: number }[]) durByPath.set(r.path, r.ms)

  const blogTitle = new Map<string, { title: string; publishedAt: string | null }>()
  for (const r of blogTitleRows as { slug: string; title: string; published_at: string | null }[]) {
    blogTitle.set(r.slug, { title: r.title, publishedAt: r.published_at })
  }
  const titleFor = (path: string): string => {
    if (STATIC_TITLE[path]) return STATIC_TITLE[path]!
    if (path.startsWith('/blog/')) return blogTitle.get(path.slice('/blog/'.length))?.title ?? path
    return path
  }

  // Seri: eksik günleri 0'la
  const seriesMap = new Map<string, { views: number; visitors: number }>()
  for (const r of seriesRows as { d: string; views: number; visitors: number }[]) seriesMap.set(r.d, { views: r.views, visitors: r.visitors })
  const series: SeriesPoint[] = dayKeys(days).map((date) => ({ date, views: seriesMap.get(date)?.views ?? 0, visitors: seriesMap.get(date)?.visitors ?? 0 }))

  const topPages: PageRow[] = (pagesRows as { path: string; views: number; visitors: number }[]).map((r) => ({
    path: r.path, title: titleFor(r.path), views: r.views, visitors: r.visitors, avgSeconds: Math.round((durByPath.get(r.path) ?? 0) / 1000),
  }))

  const blog: BlogRow[] = (pagesRows as { path: string; views: number; visitors: number }[])
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

  const channels: ChannelRow[] = (channelRows as { channel: string; visits: number }[])
    .map((r) => ({ key: r.channel, label: CHANNEL_LABEL[r.channel] ?? r.channel, visits: r.visits }))
    .sort((a, b) => CHANNEL_ORDER.indexOf(a.key) - CHANNEL_ORDER.indexOf(b.key))

  const referrers: SourceRow[] = (referrerRows as { source: string; visits: number }[]).map((r) => ({ source: r.source, visits: r.visits }))

  const utmMap = (rows: unknown[]): UtmRow[] => (rows as { value: string; visits: number }[]).map((r) => ({ value: r.value, visits: r.visits }))

  const devices: BreakdownRow[] = (deviceRows as { key: string; visits: number }[]).map((r) => ({ key: r.key, label: DEVICE_LABEL[r.key] ?? r.key, visits: r.visits }))
  const browsers: BreakdownRow[] = (browserRows as { key: string; visits: number }[]).map((r) => ({ key: r.key, label: r.key, visits: r.visits }))
  const countries: BreakdownRow[] = (countryRows as { key: string; visits: number }[]).map((r) => ({ key: r.key, label: COUNTRY_LABEL[r.key] ?? r.key, visits: r.visits }))

  return {
    generatedAt: new Date().toISOString(),
    live: true,
    range,
    totals: {
      views,
      visitors,
      viewsPerVisit: round2(sessions > 0 ? views / sessions : 0),
      avgDuration: Math.round(t.avg_ms ?? 0) / 1000,
      conversions,
      conversionRate: visitors > 0 ? Math.round((conversions / visitors) * 1000) / 10 : 0,
      deltaViews: pct(views - (prev.views ?? 0), prev.views ?? 0),
      deltaVisitors: pct(visitors - (prev.visitors ?? 0), prev.visitors ?? 0),
    },
    series,
    topPages,
    blog,
    channels,
    referrers,
    utm: { source: utmMap(utmSrcRows), medium: utmMap(utmMedRows), campaign: utmMap(utmCampRows) },
    devices,
    browsers,
    countries,
  }
}

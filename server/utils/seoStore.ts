import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'
import { AI_BOTS, DEFAULT_PAGES, DEFAULT_SETTINGS, makePage } from './seoDefaults'
import { getPublishedPost } from './contentStore'
import type { BlogPost } from './contentTypes'
import type {
  DeepPartial,
  PageSeo,
  ResolvedPageMeta,
  SeoBundle,
  SeoOverrides,
  SeoRedirect,
  SeoSettings,
  SettingsKey,
} from './seoTypes'

/**
 * SEO verisi: waitlist ile aynı Neon'da, landing'e ait kendi kendini kuran
 * tablolar (backend'in golang-migrate şemasından bağımsız). DB yoksa/boşsa
 * her şey kod varsayılanlarıyla çalışır — bu yüzden smoke/CI ortamında da
 * site aynen render olur.
 */

export const SETTINGS_KEYS: SettingsKey[] = ['general', 'robots', 'llms', 'schema', 'faq']

/** Kodda karşılığı olan gerçek sayfalar — sitemap ve panel listesi bunlardan başlar. */
export const KNOWN_PATHS = Object.keys(DEFAULT_PAGES)

const CACHE_TTL_MS = 60_000

type CacheEntry = { at: number; overrides: SeoOverrides }
let cache: CacheEntry | null = null
let ensured = false

type Sql = NeonQueryFunction<false, false>

function sqlClient(event: H3Event): Sql | null {
  const url = useRuntimeConfig(event).databaseUrl
  return url ? neon(url) : null
}

export function hasDb(event: H3Event): boolean {
  return Boolean(useRuntimeConfig(event).databaseUrl)
}

async function ensureTables(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS seo_settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS seo_pages (
      path text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS seo_redirects (
      from_path text PRIMARY KEY,
      to_path text NOT NULL,
      code int NOT NULL DEFAULT 301,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  ensured = true
}

const EMPTY_OVERRIDES: SeoOverrides = { settings: {}, pages: {}, redirects: [] }

/** DB'deki ham override'lar (60 sn bellek cache'li). Hata → varsayılanlara düş. */
export async function loadOverrides(event: H3Event): Promise<SeoOverrides> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.overrides
  const sql = sqlClient(event)
  if (!sql) return EMPTY_OVERRIDES
  try {
    await ensureTables(sql)
    const [settingsRows, pageRows, redirectRows] = await Promise.all([
      sql`SELECT key, value, updated_at FROM seo_settings`,
      sql`SELECT path, value, updated_at FROM seo_pages`,
      sql`SELECT from_path, to_path, code FROM seo_redirects`,
    ])
    const overrides: SeoOverrides = {
      settings: Object.fromEntries(
        settingsRows
          .filter((r) => (SETTINGS_KEYS as string[]).includes(r.key as string))
          .map((r) => [r.key, r.value]),
      ),
      pages: Object.fromEntries(
        pageRows.map((r) => [r.path as string, r.value as DeepPartial<PageSeo>]),
      ),
      redirects: redirectRows.map((r) => ({
        from: r.from_path as string,
        to: r.to_path as string,
        code: (r.code === 302 ? 302 : 301) as 301 | 302,
      })),
    }
    // Panelde "son güncelleme" gösterebilmek ve sitemap lastmod'u için satır zamanları.
    overrides.updatedAt = Object.fromEntries([
      ...settingsRows.map((r) => [`settings:${r.key}`, String(r.updated_at)]),
      ...pageRows.map((r) => [`page:${r.path}`, String(r.updated_at)]),
    ])
    cache = { at: Date.now(), overrides }
    return overrides
  } catch (err) {
    console.error('[seo] override okunamadı, varsayılanlara düşülüyor:', err)
    return EMPTY_OVERRIDES
  }
}

export async function invalidateSeoCache() {
  cache = null
  // swr route kuralıyla cache'lenmiş sayfa HTML'lerini de düşür ki panel
  // değişikliği kendi sunucumuzda anında görünsün (Vercel edge/ISR kopyası
  // kendi süresiyle en geç ~60 sn'de tazelenir; oradan temizlenemez).
  try {
    await useStorage('cache').clear()
  } catch {
    /* cache mount yoksa sorun değil */
  }
}

/** Derin birleştirme: diziler ve null'lar OLDUĞU GİBİ değiştirir, nesneler birleşir. */
export function deepMerge<T>(base: T, patch: DeepPartial<T> | undefined): T {
  if (patch === undefined) return base
  if (Array.isArray(base) || Array.isArray(patch)) return patch as T
  if (base !== null && patch !== null && typeof base === 'object' && typeof patch === 'object') {
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) }
    for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
      const baseVal = (base as Record<string, unknown>)[k]
      out[k] = baseVal === undefined ? v : deepMerge(baseVal, v as never)
    }
    return out as T
  }
  return patch as T
}

/** Efektif paket: varsayılanlar + DB override'ları. */
export async function getSeoBundle(event: H3Event): Promise<SeoBundle> {
  const overrides = await loadOverrides(event)
  const settings = Object.fromEntries(
    SETTINGS_KEYS.map((k) => [k, deepMerge(DEFAULT_SETTINGS[k], overrides.settings[k] as never)]),
  ) as unknown as SeoSettings

  const paths = new Set([...KNOWN_PATHS, ...Object.keys(overrides.pages)])
  const pages: Record<string, PageSeo> = {}
  for (const path of paths) {
    const base = DEFAULT_PAGES[path] ?? makePage({})
    pages[path] = deepMerge<PageSeo>(base, overrides.pages[path])
  }
  return { settings, pages, redirects: overrides.redirects }
}

function absolutize(url: string, baseUrl: string): string {
  if (!url) return ''
  return /^https?:\/\//.test(url) ? url : baseUrl.replace(/\/$/, '') + url
}

function normalizePath(path: string): string {
  let p = (path || '/').split('?')[0]!.split('#')[0]!
  if (!p.startsWith('/')) p = '/' + p
  if (p.length > 1) p = p.replace(/\/+$/, '')
  return p
}

/** Bir sayfanın render edilecek nihai meta seti. Bilinmeyen path'ler de tutarlı üretir (404 sayfası dahil). */
export async function resolvePageMeta(event: H3Event, rawPath: string): Promise<ResolvedPageMeta> {
  const path = normalizePath(rawPath)
  const [{ settings, pages }, overrides] = await Promise.all([getSeoBundle(event), loadOverrides(event)])
  const g = settings.general
  let page = pages[path] ?? makePage({})

  // Blog yazısı: meta tabanı DB'deki yazıdan gelir, panelin sayfa override'ı
  // (seo_pages['/blog/<slug>']) ham haliyle üstüne biner. Yayında olmayan/
  // bilinmeyen slug mevcut bilinmeyen-yol davranışına düşer (sayfa 404 verir).
  let post: BlogPost | null = null
  if (path.startsWith('/blog/') && path !== '/blog') {
    post = await getPublishedPost(event, path.slice('/blog/'.length))
    if (post) {
      const postPage = makePage({
        title: `${post.title} — afiet`,
        description: post.description,
        ogTitle: post.title,
        ogDescription: post.description,
        ogImage: post.coverUrl ?? '',
        sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
      })
      page = deepMerge<PageSeo>(postPage, overrides.pages[path])
    }
  }

  const title = page.title || g.defaultTitle
  const description = page.description || g.defaultDescription
  const ogImage = absolutize(page.ogImage || g.defaultOgImage, g.baseUrl)
  const canonical = page.canonical || g.baseUrl.replace(/\/$/, '') + (path === '/' ? '/' : path)
  const robots = settings.robots.indexable ? page.robots : 'noindex, nofollow'

  const jsonld: Record<string, unknown>[] = []
  if (path === '/') {
    const graph: Record<string, unknown>[] = []
    const s = settings.schema
    if (s.organization.enabled) {
      graph.push({
        '@type': 'Organization',
        name: s.organization.name,
        url: s.organization.url,
        logo: absolutize(s.organization.logo, g.baseUrl),
        ...(s.organization.sameAs.length ? { sameAs: s.organization.sameAs } : {}),
        ...(s.organization.contactEmail ? { email: s.organization.contactEmail } : {}),
      })
    }
    if (s.website.enabled) {
      graph.push({
        '@type': 'WebSite',
        name: g.siteName,
        url: g.baseUrl,
        inLanguage: g.locale.replace('_', '-'),
      })
    }
    if (s.mobileApp.enabled) {
      graph.push({
        '@type': 'SoftwareApplication',
        name: s.mobileApp.name,
        applicationCategory: s.mobileApp.category,
        operatingSystem: s.mobileApp.operatingSystem,
        description: s.mobileApp.description,
        ...(s.mobileApp.appStoreUrl || s.mobileApp.playStoreUrl
          ? {
              installUrl: [s.mobileApp.appStoreUrl, s.mobileApp.playStoreUrl].filter(Boolean),
            }
          : {}),
      })
    }
    if (graph.length) jsonld.push({ '@context': 'https://schema.org', '@graph': graph })

    if (settings.faq.enabled && settings.faq.items.length) {
      jsonld.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: settings.faq.items.map((it) => ({
          '@type': 'Question',
          name: it.q,
          acceptedAnswer: { '@type': 'Answer', text: it.a },
        })),
      })
    }
  }
  const base = g.baseUrl.replace(/\/$/, '')
  if (path === '/blog') {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: `${g.siteName} blog`,
      url: `${base}/blog`,
      description,
      inLanguage: g.locale.replace('_', '-'),
    })
  }
  if (post) {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      inLanguage: g.locale.replace('_', '-'),
      ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
      dateModified: post.updatedAt,
      mainEntityOfPage: canonical,
      ...(post.tags.length ? { keywords: post.tags.join(', ') } : {}),
      ...(post.coverUrl ? { image: absolutize(post.coverUrl, g.baseUrl) } : {}),
      author: { '@type': 'Organization', name: g.siteName, url: g.baseUrl },
      publisher: {
        '@type': 'Organization',
        name: g.siteName,
        url: g.baseUrl,
        logo: { '@type': 'ImageObject', url: absolutize('/icon.svg', g.baseUrl) },
      },
    })
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${base}/blog` },
        { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
      ],
    })
  }
  jsonld.push(...page.jsonld)

  const showFaq =
    path === '/' && settings.faq.showOnLanding && settings.faq.items.length > 0
  return {
    path,
    title,
    description,
    canonical,
    robots,
    ogTitle: page.ogTitle || title,
    ogDescription: page.ogDescription || description,
    ogImage,
    ogImageAlt: g.ogImageAlt,
    ogUrl: canonical,
    ogSiteName: g.siteName,
    ogLocale: g.locale,
    twitterSite: g.twitterSite,
    themeColor: g.themeColor,
    verification: g.verification,
    jsonld,
    faq: showFaq
      ? { title: settings.faq.title, intro: settings.faq.intro, items: settings.faq.items }
      : null,
    ogType: post ? 'article' : 'website',
    ...(post?.publishedAt ? { publishedAt: post.publishedAt } : {}),
    ...(post ? { modifiedAt: post.updatedAt } : {}),
  }
}

/** robots.txt içeriği. */
export function buildRobotsTxt(settings: SeoSettings): string {
  const lines: string[] = []
  if (!settings.robots.indexable) {
    lines.push('User-agent: *', 'Disallow: /')
  } else {
    lines.push('User-agent: *', 'Allow: /')
    // Kod listesi sıralı; DB'den gelen özel botlar sona eklenir.
    const known = new Set(AI_BOTS.map((b) => b.agent))
    const ordered = [
      ...AI_BOTS.map((b) => b.agent),
      ...Object.keys(settings.robots.aiBots).filter((a) => !known.has(a)),
    ]
    for (const agent of ordered) {
      const allow = settings.robots.aiBots[agent]
      if (allow === false) lines.push('', `User-agent: ${agent}`, 'Disallow: /')
    }
  }
  const extra = settings.robots.extraRules.trim()
  if (extra) lines.push('', extra)
  lines.push('', `Sitemap: ${settings.general.baseUrl.replace(/\/$/, '')}/sitemap.xml`)
  return lines.join('\n') + '\n'
}

export function xmlEscape(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** sitemap.xml içeriği — kodda var olan sayfalar + dinamik ekler (blog yazıları). */
export function buildSitemapXml(
  bundle: SeoBundle,
  updatedAt: Record<string, string> = {},
  extra: { loc: string; lastmod?: string }[] = [],
): string {
  const base = bundle.settings.general.baseUrl.replace(/\/$/, '')
  const entries = KNOWN_PATHS.filter((p) => bundle.pages[p]?.sitemap.include !== false)
    .map((p) => {
      const page = bundle.pages[p]!
      const loc = xmlEscape(base + (p === '/' ? '/' : p))
      const lastmod = updatedAt[`page:${p}`]
      const parts = [`  <url>`, `    <loc>${loc}</loc>`]
      if (lastmod) parts.push(`    <lastmod>${new Date(lastmod).toISOString()}</lastmod>`)
      if (page.sitemap.changefreq) parts.push(`    <changefreq>${page.sitemap.changefreq}</changefreq>`)
      if (page.sitemap.priority !== null)
        parts.push(`    <priority>${page.sitemap.priority.toFixed(1)}</priority>`)
      parts.push('  </url>')
      return parts.join('\n')
    })
  for (const e of extra) {
    const parts = [`  <url>`, `    <loc>${xmlEscape(e.loc)}</loc>`]
    if (e.lastmod) parts.push(`    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>`)
    parts.push('  </url>')
    entries.push(parts.join('\n'))
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join('\n') +
    '\n</urlset>\n'
  )
}

/** Yönlendirme tablosu (middleware'de kullanılır). */
export async function getRedirects(event: H3Event): Promise<SeoRedirect[]> {
  const { redirects } = await loadOverrides(event)
  return redirects
}

export { normalizePath }
export const seoDefaultsForAdmin = () => ({
  settings: DEFAULT_SETTINGS,
  pages: DEFAULT_PAGES,
  aiBots: AI_BOTS,
  knownPaths: KNOWN_PATHS,
})

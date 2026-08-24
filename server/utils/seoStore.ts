import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'
import { AI_BOTS, DEFAULT_PAGES, DEFAULT_REDIRECTS, DEFAULT_SETTINGS, ROBOTS_DIRECTIVES, makePage } from './seoDefaults'
import { getPublishedPost, getTranslationPair } from './contentStore'
import type { BlogPost } from './contentTypes'
import { getSupportArticle } from './supportStore'
import { supportCategory } from './supportCategories'
import { getRelease } from './releaseStore'
import { hesapFaqItems } from './hesaplaStore'
import type { SupportArticle, SupportCategory } from '#shared/types/support'
import type { ReleaseNote } from '#shared/types/release'
import { blogPath, counterpartOf, localeOf } from '#shared/utils/locales'
import { AUTHOR, personSchema } from '#shared/utils/author'
import { MAGAZA } from '#shared/utils/marka'
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
 * SEO verisi: beta başvurularıyla aynı Neon'da, landing'e ait kendi kendini kuran
 * tablolar (backend'in golang-migrate şemasından bağımsız). DB yoksa/boşsa
 * her şey kod varsayılanlarıyla çalışır - bu yüzden smoke/CI ortamında da
 * site aynen render olur.
 */

export const SETTINGS_KEYS: SettingsKey[] = ['general', 'robots', 'llms', 'schema', 'faq']

/** Kodda karşılığı olan gerçek sayfalar - sitemap ve panel listesi bunlardan başlar. */
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
  return { settings, pages, redirects: mergeRedirects(overrides.redirects) }
}

/**
 * Kod varsayılanı yönlendirmeler + panelden gelenler. Aynı `from` için PANEL
 * KAZANIR: yapısal taşımalar kodda yaşar ama acil bir durumda hedefi panelden
 * değiştirebilmek gerekir (deploy beklemeden). Sıra da panelinkiyle başlar,
 * çünkü middleware ilk eşleşmeyi alır.
 */
function mergeRedirects(fromPanel: SeoRedirect[]): SeoRedirect[] {
  const ezilen = new Set(fromPanel.map((r) => normalizePath(r.from)))
  return [...fromPanel, ...DEFAULT_REDIRECTS.filter((r) => !ezilen.has(normalizePath(r.from)))]
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

/**
 * SoftwareApplication'ın fiyat düğümü.
 *
 * BUGÜN HİÇ BASILMAZ (kullanıcı kararı, 24 Ağu 2026). afiet+ iOS'ta gerçekten
 * satın alınabiliyor, yani fiyat artık "uydurma" değil; basmama sebebi başka:
 * site hiçbir sayfasında fiyat söylemiyor. Şema, sayfanın söylemediğini iddia
 * etmemelidir. İkinci sebep, lansmanın ilk yıl intro fiyatı sürerken yalnız
 * liste fiyatını bildirmenin eksik anlatması.
 *
 * AÇILDIĞI GÜN: siteye bir afiet+ bölümü girer, fiyatlar `#shared/utils/marka`
 * içinde tek kaynak olur ve bu fonksiyon onları okur. Fonksiyon bilerek
 * duruyor: kaldırıp yeniden yazmak, şemanın nereye bağlanacağını bir daha
 * keşfetmeyi gerektirirdi.
 */
function mobilAppOffers(_lang: 'tr' | 'en'): Record<string, unknown> | null {
  return null
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
  // Yazı KENDİ dilinin yolundan okunur: /blog/<slug> yalnız Türkçe,
  // /en/blog/<slug> yalnız İngilizce yazıyı bulur. Yanlış dilde istenen slug
  // bilinmeyen yol davranışına düşer (sayfa 404 verir).
  const isEnBlogPost = path.startsWith('/en/blog/') && path !== '/en/blog'
  const isTrBlogPost = path.startsWith('/blog/') && path !== '/blog'
  if (isTrBlogPost || isEnBlogPost) {
    post = isEnBlogPost
      ? await getPublishedPost(event, path.slice('/en/blog/'.length), 'en')
      : await getPublishedPost(event, path.slice('/blog/'.length), 'tr')
    if (post) {
      const postPage = makePage({
        title: `${post.title} | afiet`,
        description: post.description,
        ogTitle: post.title,
        ogDescription: post.description,
        ogImage: post.coverUrl ?? '',
        sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
      })
      page = deepMerge<PageSeo>(postPage, overrides.pages[path])
    }
  }

  // Destek yazısı: meta tabanı markdown dosyasının frontmatter'ından gelir,
  // panelin sayfa override'ı (seo_pages['/destek/<kategori>/<slug>']) üstüne
  // biner. Kategori sayfalarının meta'sı DEFAULT_PAGES'ta hazırdır.
  let supportArticle: SupportArticle | null = null
  let supportCat: SupportCategory | null = null
  if (path.startsWith('/destek/')) {
    const parts = path.slice('/destek/'.length).split('/')
    supportCat = supportCategory(parts[0] ?? '')
    if (supportCat && parts.length === 2 && parts[1]) {
      supportArticle = await getSupportArticle(supportCat.slug, parts[1])
      if (supportArticle) {
        const articlePage = makePage({
          title: `${supportArticle.title} | afiet destek`,
          description: supportArticle.summary,
          ogTitle: supportArticle.title,
          ogDescription: supportArticle.summary,
          sitemap: { include: true, changefreq: 'monthly', priority: 0.5 },
        })
        page = deepMerge<PageSeo>(articlePage, overrides.pages[path])
      }
    }
  }

  // Sürüm notu: meta tabanı markdown dosyasının frontmatter'ından gelir, panelin
  // sayfa override'ı (seo_pages['/yenilikler/<sürüm>']) üstüne biner. Bilinmeyen
  // sürüm mevcut bilinmeyen-yol davranışına düşer (sayfa 404 döner).
  let release: ReleaseNote | null = null
  if (path.startsWith('/yenilikler/')) {
    release = await getRelease(path.slice('/yenilikler/'.length))
    if (release) {
      const releasePage = makePage({
        title: `${release.title} (v${release.version}) | afiet sürüm notları`,
        description: release.summary,
        ogTitle: `afiet v${release.version}: ${release.title}`,
        ogDescription: release.summary,
        sitemap: { include: true, changefreq: 'yearly', priority: 0.4 },
      })
      page = deepMerge<PageSeo>(releasePage, overrides.pages[path])
    }
  }

  const title = page.title || g.defaultTitle
  const description = page.description || g.defaultDescription
  const ogImage = absolutize(page.ogImage || g.defaultOgImage, g.baseUrl)
  const canonical = page.canonical || g.baseUrl.replace(/\/$/, '') + (path === '/' ? '/' : path)
  /* Site kapatıldıysa her sayfa noindex; açıkken sayfanın kendi override'ı
     (panelden) varsa o, yoksa global direktif satırı basılır. Override
     BİRLEŞTİRİLMEZ: panelde bir yola robots yazan kişi o sayfanın tamamını
     kastediyordur (örn. 'noindex, nofollow' satırına max-snippet eklemek
     anlamsız olurdu). */
  const robots = settings.robots.indexable
    ? page.robots || ROBOTS_DIRECTIVES
    : 'noindex, nofollow'

  // Sayfanın dili: /en altı İngilizce (shared/utils/locales.ts). Şemadaki
  // `inLanguage` ve og:locale bunu izler; genel ayardaki locale (tr_TR)
  // yalnız Türkçe sayfalar içindir.
  const isEn = localeOf(path) === 'en'
  const inLanguage = isEn ? 'en-US' : g.locale.replace('_', '-')

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
        inLanguage,
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
        ...(mobilAppOffers('tr') ?? {}),
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
  if (path === '/blog' || path === '/en/blog') {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: `${g.siteName} blog`,
      url: `${base}${path}`,
      description,
      inLanguage,
    })
  }
  if (post) {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      inLanguage,
      ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
      dateModified: post.updatedAt,
      mainEntityOfPage: canonical,
      ...(post.tags.length ? { keywords: post.tags.join(', ') } : {}),
      ...(post.coverUrl ? { image: absolutize(post.coverUrl, g.baseUrl) } : {}),
      /* Yazar Organization DEĞİL Person: beslenme YMYL bir alan ve hem klasik
         arama hem üretken motorlar "bunu kim yazdı" sorusunun makine okunur
         cevabını arıyor. Düğüm sayfadaki görünür yazar bloğuyla AYNI kaynaktan
         gelir (shared/utils/author.ts), yoksa şema sayfanın söylemediğini
         iddia eder. Yayıncı kurum olarak kalır: yazan kişi, yayınlayan afiet. */
      author: personSchema(g.baseUrl, post.lang === 'en' ? 'en' : 'tr'),
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
        {
          '@type': 'ListItem',
          position: 1,
          name: post.lang === 'en' ? 'Home' : 'Ana sayfa',
          item: `${base}${post.lang === 'en' ? '/en' : '/'}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: `${base}${post.lang === 'en' ? '/en/blog' : '/blog'}`,
        },
        { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
      ],
    })
  }
  // ── Destek merkezi şeması ───────────────────────────────────────────────
  // Yazılarda HowTo BİLİNÇLİ olarak kullanılmıyor: Google HowTo zengin
  // sonuçlarını 2023'te büyük ölçüde kaldırdı ve markdown'dan güvenilir adım
  // nesnesi üretmek uydurma yapıya davetiye. TechArticle hem doğru hem yeterli.
  if (path === '/destek') {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'afiet destek merkezi',
      url: `${base}/destek`,
      description,
      inLanguage,
      isPartOf: { '@type': 'WebSite', name: g.siteName, url: g.baseUrl },
    })
  } else if (supportCat && !supportArticle) {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: supportCat.title,
      url: canonical,
      description,
      inLanguage,
    })
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: `${base}/` },
        { '@type': 'ListItem', position: 2, name: 'Destek', item: `${base}/destek` },
        { '@type': 'ListItem', position: 3, name: supportCat.title, item: canonical },
      ],
    })
  } else if (supportCat && supportArticle) {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: supportArticle.title,
      description: supportArticle.summary,
      inLanguage,
      dateModified: supportArticle.updated,
      mainEntityOfPage: canonical,
      articleSection: supportCat.title,
      // Blogdaki gerekçenin aynısı: destek yazıları da bir kişi tarafından
      // yazılıyor ve sayfada künyesi görünüyor (destek yazı sayfası).
      author: personSchema(g.baseUrl, 'tr'),
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
        { '@type': 'ListItem', position: 2, name: 'Destek', item: `${base}/destek` },
        {
          '@type': 'ListItem',
          position: 3,
          name: supportCat.title,
          item: `${base}/destek/${supportCat.slug}`,
        },
        { '@type': 'ListItem', position: 4, name: supportArticle.title, item: canonical },
      ],
    })
  }

  // ── Sürüm notları şeması ────────────────────────────────────────────────
  // SoftwareApplication ana sayfada bir kez tanımlı; burada tekrar edilmez.
  // Sürüm sayfası TechArticle'dır: değişikliği anlatan bir metindir, indirilen
  // bir sürüm nesnesi değil.
  if (path === '/yenilikler') {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'afiet sürüm notları',
      url: `${base}/yenilikler`,
      description,
      inLanguage,
      isPartOf: { '@type': 'WebSite', name: g.siteName, url: g.baseUrl },
    })
  } else if (release) {
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: `afiet v${release.version}: ${release.title}`,
      description: release.summary,
      inLanguage,
      datePublished: release.date,
      dateModified: release.date,
      mainEntityOfPage: canonical,
      articleSection: 'Sürüm notları',
      about: { '@type': 'SoftwareApplication', name: g.siteName, softwareVersion: release.version },
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
        { '@type': 'ListItem', position: 2, name: 'Sürüm notları', item: `${base}/yenilikler` },
        { '@type': 'ListItem', position: 3, name: `v${release.version}`, item: canonical },
      ],
    })
  }

  // ── Hesaplama aracı şeması ──────────────────────────────────────────────
  // Sayfa hem bir araç hem bir yazıdır; şema aracı anlatır (WebApplication),
  // metni değil. Ücretsiz olduğu açıkça yazılır: bu, arama sonucunda "ücretsiz
  // hesaplayıcı" arayan niyetin karşılığıdır.
  //
  // FAQPage'in SERP'te görsel karşılığı YOKTUR (Google zengin sonucu Ağustos
  // 2023'te kamu ve sağlık siteleriyle sınırladı). Yine de basılır: llms.txt ile
  // birlikte yapay zekâ motorlarının soruyu doğru cevapla eşleştirmesine yarar,
  // panelin adı da bu yüzden "SEO & GEO". Sorular ekranda görünen SSS ile AYNI
  // kaynaktan (content/hesapla/<slug>.md) gelir; boşsa şema hiç basılmaz.
  //
  // İngilizce araçlar (/en/tools/<slug>) AYNI şemayı üretir; değişen yalnız
  // kırıntı yolunun adları, tarayıcı gereksinimi cümlesi ve para birimidir.
  // SSS iki dilde de kendi markdown dosyasından gelir (slug İngilizce'de
  // `bmi-calculator`, Türkçe'de `vucut-kitle-indeksi`).
  const isTool = path.startsWith('/hesapla/') || path.startsWith('/en/tools/')
  if (isTool) {
    const slug = isEn ? path.slice('/en/tools/'.length) : path.slice('/hesapla/'.length)
    // Şemadaki ad marka ekini taşımaz: "| afiet" başlık çubuğu içindir.
    const toolName = title.replace(/\s*\|\s*afiet\s*$/, '')
    const hubPath = isEn ? '/en/tools' : '/hesapla'
    const homePath = isEn ? '/en' : '/'
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: toolName,
      url: canonical,
      description,
      applicationCategory: 'HealthApplication',
      browserRequirements: isEn ? 'Requires JavaScript' : 'JavaScript gerektirir',
      inLanguage,
      isPartOf: { '@type': 'WebSite', name: g.siteName, url: g.baseUrl },
      offers: { '@type': 'Offer', price: '0', priceCurrency: isEn ? 'USD' : 'TRY' },
      publisher: { '@type': 'Organization', name: g.siteName, url: g.baseUrl },
    })
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: isEn ? 'Home' : 'Ana sayfa',
          item: `${base}${homePath === '/' ? '/' : homePath}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: isEn ? 'Tools' : 'Hesapla',
          item: `${base}${hubPath}`,
        },
        { '@type': 'ListItem', position: 3, name: toolName, item: canonical },
      ],
    })
    const faq = await hesapFaqItems(slug)
    if (faq.length) {
      jsonld.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((it) => ({
          '@type': 'Question',
          name: it.q,
          acceptedAnswer: { '@type': 'Answer', text: it.a },
        })),
      })
    }
  }

  // ── Hesaplayıcı hub'ı (/hesapla, /en/tools) ─────────────────────────────
  // Hub, alt sayfalarının hepsi şemalıyken kendisi şemasız kalmıştı: bir
  // arama motoru için "hesaplayıcılar" sayfası ile beş aracın ilişkisi
  // görünmüyor, üretken bir motor için de "afiet'te hangi hesaplayıcılar var"
  // sorusunun makine okunur cevabı hiç yoktu. CollectionPage sayfayı,
  // ItemList içindekileri tarif eder.
  //
  // Liste `pages`ten (SEO katmanının bildiği sayfalar) türetilir, kopya
  // dosyasındaki kart listesinden DEĞİL: burada tek doğru "gerçekten var olan
  // ve indekslenen alt sayfa" kümesidir. Kart eklenip sayfa açılmazsa şema
  // olmayan bir aracı vaat ederdi.
  //
  // `itemListOrder` bilinçli olarak Unordered: ekrandaki kart sırası ile
  // buradaki sıra aynı kaynaktan gelmiyor ve hub bir sıralama (ilk/en iyi)
  // iddia etmiyor. Sıra iddia etmeyen liste, yanlış sıra iddia eden listeden
  // iyidir.
  const isToolHub = path === '/hesapla' || path === '/en/tools'
  if (isToolHub) {
    const araclar = Object.keys(pages)
      .filter((p) => p.startsWith(`${path}/`))
      .map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: (pages[p]?.title || '').replace(/\s*\|\s*afiet\s*$/, ''),
        item: `${base}${p}`,
      }))
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title.replace(/\s*\|\s*afiet\s*$/, ''),
      url: canonical,
      description,
      inLanguage,
      isPartOf: { '@type': 'WebSite', name: g.siteName, url: g.baseUrl },
      ...(araclar.length
        ? {
            mainEntity: {
              '@type': 'ItemList',
              itemListOrder: 'https://schema.org/ItemListUnordered',
              numberOfItems: araclar.length,
              itemListElement: araclar,
            },
          }
        : {}),
    })
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: isEn ? 'Home' : 'Ana sayfa',
          item: `${base}${isEn ? '/en' : '/'}`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: isEn ? 'Tools' : 'Hesapla',
          item: canonical,
        },
      ],
    })
  }

  // ── Yazar sayfası (/hakkinda, /en/about) ────────────────────────────────
  // ProfilePage + mainEntity Person: sayfanın KONUSU bir kişidir. Blog ve
  // destek yazılarındaki `author` düğümü bu sayfanın `@id`siyle aynı kimliği
  // taşır (shared/utils/author.ts), yani dağınık yüzeyler motorların gözünde
  // TEK varlığa toplanır. `@id` iki dilde de Türkçe yola bağlıdır: kimlik
  // dile göre çoğalmaz, yalnız anlatımı çevrilir.
  if (path === AUTHOR.path.tr || path === AUTHOR.path.en) {
    const lang = isEn ? 'en' : 'tr'
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: title,
      url: canonical,
      description,
      inLanguage,
      isPartOf: { '@type': 'WebSite', name: g.siteName, url: g.baseUrl },
      mainEntity: {
        ...personSchema(g.baseUrl, lang),
        worksFor: { '@type': 'Organization', name: g.siteName, url: g.baseUrl },
      },
    })
    jsonld.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: isEn ? 'Home' : 'Ana sayfa',
          item: `${base}${isEn ? '/en' : '/'}`,
        },
        { '@type': 'ListItem', position: 2, name: isEn ? 'About' : 'Hakkında', item: canonical },
      ],
    })
  }

  // İngilizce ana sayfa: marka VARLIĞI iki dilde de aynı olmalı (aynı
  // Organization, aynı sameAs) ki üretken motorlar afiet'i tek kimlik olarak
  // tanısın. WebSite bilerek tekrar edilmez; site tektir, dili sayfaya aittir.
  if (path === '/en') {
    const s = settings.schema
    const graph: Record<string, unknown>[] = []
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
    if (s.mobileApp.enabled) {
      graph.push({
        '@type': 'SoftwareApplication',
        name: s.mobileApp.name,
        applicationCategory: s.mobileApp.category,
        operatingSystem: s.mobileApp.operatingSystem,
        // Panelin açıklaması Türkçedir; İngilizce sayfada sayfanın kendi
        // (İngilizce) açıklaması kullanılır.
        description,
        inLanguage,
        ...(s.mobileApp.appStoreUrl || s.mobileApp.playStoreUrl
          ? { installUrl: [s.mobileApp.appStoreUrl, s.mobileApp.playStoreUrl].filter(Boolean) }
          : {}),
        ...(mobilAppOffers('en') ?? {}),
      })
    }
    if (graph.length) jsonld.push({ '@context': 'https://schema.org', '@graph': graph })
  }

  jsonld.push(...page.jsonld)

  // ── Çok dillilik ────────────────────────────────────────────────────────
  // hreflang YALNIZ iki dilde de var olan çiftlere basılır (EN_BY_TR tek
  // kaynak). x-default TR'yi gösterir: ana pazar Türkiye, kök URL Türkçedir.
  // ogLocale sayfanın kendi dilidir; genel ayar (tr_TR) yalnız TR'ye uygulanır.
  const counterpart = counterpartOf(path)
  let alternates: { hreflang: string; href: string }[] | undefined
  if (counterpart) {
    const trPath = isEn ? counterpart : path
    const enPath = isEn ? path : counterpart
    const trHref = base + (trPath === '/' ? '/' : trPath)
    alternates = [
      { hreflang: 'tr', href: trHref },
      { hreflang: 'en', href: base + enPath },
      { hreflang: 'x-default', href: trHref },
    ]
  } else if (post) {
    /* Blog yazıları statik haritaya giremez (veritabanında yaşıyorlar), eşleme
       `translation_of` kolonundadır ve TEK BİR SATIRA yazılır. Bu yüzden eş
       çift yönlü aranır (`findTranslationPair`): yalnız ileri yönde arasaydık
       çevirisi olan Türkçe yazı hreflang basmaz, eşleme tek yönlü kalır ve
       Google tek yönlü hreflang'i yok sayar. Kural sayfalardakiyle AYNI: karşı
       yazı gerçekten yayında ve öteki dilde değilse hiç basılmaz. */
    const pair = await getTranslationPair(event, post)
    if (pair) {
      const trSlug = post.lang === 'tr' ? post.slug : pair.slug
      const enSlug = post.lang === 'en' ? post.slug : pair.slug
      const trHref = base + blogPath('tr', trSlug)
      alternates = [
        { hreflang: 'tr', href: trHref },
        { hreflang: 'en', href: base + blogPath('en', enSlug) },
        { hreflang: 'x-default', href: trHref },
      ]
    }
  }

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
    ogLocale: isEn ? 'en_US' : g.locale,
    twitterSite: g.twitterSite,
    themeColor: g.themeColor,
    verification: g.verification,
    jsonld,
    faq: showFaq
      ? { title: settings.faq.title, intro: settings.faq.intro, items: settings.faq.items }
      : null,
    ogType: post || supportArticle ? 'article' : 'website',
    ...(post?.publishedAt ? { publishedAt: post.publishedAt } : {}),
    ...(post ? { modifiedAt: post.updatedAt } : {}),
    ...(supportArticle ? { modifiedAt: supportArticle.updated } : {}),
    ...(alternates ? { alternates } : {}),
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

/** sitemap.xml içeriği - kodda var olan sayfalar + dinamik ekler (blog yazıları). */
export function buildSitemapXml(
  bundle: SeoBundle,
  updatedAt: Record<string, string> = {},
  /**
   * Kod sayfalarının dışındaki girdiler (blog yazıları, destek yazıları,
   * sürüm notları). `alternates` yalnız blog yazılarında dolar: sayfa
   * eşlemeleri EN_BY_TR'den gelirken yazı eşlemeleri veritabanındadır.
   */
  extra: { loc: string; lastmod?: string; alternates?: { hreflang: string; href: string }[] }[] = [],
): string {
  const base = bundle.settings.general.baseUrl.replace(/\/$/, '')
  const href = (p: string) => base + (p === '/' ? '/' : p)
  /* hreflang alternates: yalnız iki dilde de var olan çiftlere, sayfadaki
     link etiketleriyle aynı kaynaktan (EN_BY_TR). İki yön de kendi girdisinde
     AYNI seti taşımak zorundadır, Google tek yönlü hreflang'i yok sayar. */
  const alternateLines = (p: string): string[] => {
    const counterpart = counterpartOf(p)
    if (!counterpart) return []
    const [trPath, enPath] = localeOf(p) === 'en' ? [counterpart, p] : [p, counterpart]
    return [
      `    <xhtml:link rel="alternate" hreflang="tr" href="${xmlEscape(href(trPath))}" />`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(href(enPath))}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(href(trPath))}" />`,
    ]
  }
  const entries = KNOWN_PATHS.filter((p) => bundle.pages[p]?.sitemap.include !== false)
    .map((p) => {
      const page = bundle.pages[p]!
      const loc = xmlEscape(href(p))
      const lastmod = updatedAt[`page:${p}`]
      const parts = [`  <url>`, `    <loc>${loc}</loc>`, ...alternateLines(p)]
      if (lastmod) parts.push(`    <lastmod>${new Date(lastmod).toISOString()}</lastmod>`)
      if (page.sitemap.changefreq) parts.push(`    <changefreq>${page.sitemap.changefreq}</changefreq>`)
      if (page.sitemap.priority !== null)
        parts.push(`    <priority>${page.sitemap.priority.toFixed(1)}</priority>`)
      parts.push('  </url>')
      return parts.join('\n')
    })
  for (const e of extra) {
    const parts = [
      `  <url>`,
      `    <loc>${xmlEscape(e.loc)}</loc>`,
      ...(e.alternates ?? []).map(
        (a) =>
          `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${xmlEscape(a.href)}" />`,
      ),
    ]
    if (e.lastmod) parts.push(`    <lastmod>${new Date(e.lastmod).toISOString()}</lastmod>`)
    parts.push('  </url>')
    entries.push(parts.join('\n'))
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    entries.join('\n') +
    '\n</urlset>\n'
  )
}

/**
 * Yönlendirme tablosu (middleware'de kullanılır).
 *
 * `getSeoBundle` gibi kod varsayılanlarını da katar: DİKKAT, burası ham
 * override'ları okur ve birleştirmeyi atlarsa `DEFAULT_REDIRECTS` hiç
 * çalışmaz - middleware paketi değil bu fonksiyonu çağırıyor.
 */
export async function getRedirects(event: H3Event): Promise<SeoRedirect[]> {
  const { redirects } = await loadOverrides(event)
  return mergeRedirects(redirects)
}

export { normalizePath }
export const seoDefaultsForAdmin = () => ({
  settings: DEFAULT_SETTINGS,
  pages: DEFAULT_PAGES,
  aiBots: AI_BOTS,
  knownPaths: KNOWN_PATHS,
})

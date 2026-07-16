/**
 * SEO/GEO ayar modeli. Kaynak-of-truth şekiller burada; kod varsayılanları
 * `seoDefaults.ts`te, DB yalnızca ÜZERİNE YAZILAN kısmi değerleri tutar
 * (boş DB = bugünkü davranışla birebir aynı). Panel (afiet-admin) bu
 * şekillerin aynısını kendi tarafında tanımlar — alan eklerken iki ucu
 * birlikte güncelle.
 */

export type SeoGeneral = {
  siteName: string
  baseUrl: string
  /** Ana sayfa ve fallback başlığı (tam metin; şablon uygulanmaz). */
  defaultTitle: string
  defaultDescription: string
  /** Göreli (/og.png) ya da mutlak URL; göreli ise baseUrl ile mutlaklaşır. */
  defaultOgImage: string
  ogImageAlt: string
  /** '@kullanici' — boşsa twitter:site basılmaz. */
  twitterSite: string
  locale: string
  themeColor: string
  /** Arama motoru site doğrulama kodları — boş olanlar basılmaz. */
  verification: { google: string; bing: string; yandex: string }
}

/** AI botları: kod listesi etiket/amaç bilgisini, DB yalnız izin bayrağını taşır. */
export type AiBotInfo = {
  /** robots.txt User-agent değeri (büyük/küçük harf botun duyurduğu gibi). */
  agent: string
  owner: string
  /** 'egitim' | 'arama' | 'kullanici' — panelde rozet olarak gösterilir. */
  purpose: 'egitim' | 'arama' | 'kullanici'
  note: string
}

export type SeoRobots = {
  /** false → tüm site: robots.txt Disallow / + her sayfada noindex,nofollow. */
  indexable: boolean
  /** agent → izin. Kod listesinde olmayan anahtarlar da (özel bot) yazılabilir. */
  aiBots: Record<string, boolean>
  /** robots.txt sonuna olduğu gibi eklenecek serbest satırlar. */
  extraRules: string
}

export type SeoLlms = {
  enabled: boolean
  /** llmstxt.org biçiminde markdown. */
  content: string
}

export type SeoSchema = {
  organization: {
    enabled: boolean
    name: string
    url: string
    logo: string
    sameAs: string[]
    contactEmail: string
  }
  website: { enabled: boolean }
  mobileApp: {
    enabled: boolean
    name: string
    operatingSystem: string
    category: string
    description: string
    /** Mağaza linkleri — uygulama yayında değilken boş bırakılır, basılmaz. */
    appStoreUrl: string
    playStoreUrl: string
  }
}

export type FaqItem = { q: string; a: string }

export type SeoFaq = {
  /** FAQPage JSON-LD üretimi. */
  enabled: boolean
  /** Ana sayfada görünür SSS bölümü (JSON-LD içerikle eşleşsin diye birlikte). */
  showOnLanding: boolean
  title: string
  intro: string
  items: FaqItem[]
}

export type SeoSettings = {
  general: SeoGeneral
  robots: SeoRobots
  llms: SeoLlms
  schema: SeoSchema
  faq: SeoFaq
}

export type SettingsKey = keyof SeoSettings

export type PageSitemap = {
  include: boolean
  /** '' → sitemap satırında changefreq basılmaz. */
  changefreq: '' | 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  /** null → priority basılmaz. */
  priority: number | null
}

export type PageSeo = {
  /** Tam başlık — yazılan neyse o basılır (şablon büyüsü yok). */
  title: string
  description: string
  /** Boş alanlar title/description/genel og görseline düşer. */
  ogTitle: string
  ogDescription: string
  ogImage: string
  /** '' → baseUrl + path'ten otomatik. */
  canonical: string
  /** '' → varsayılan (basılmaz); örn 'noindex, nofollow'. */
  robots: string
  /** Sayfaya eklenecek ek JSON-LD blokları (geçerli JSON nesneleri). */
  jsonld: Record<string, unknown>[]
  sitemap: PageSitemap
}

export type SeoRedirect = { from: string; to: string; code: 301 | 302 }

/** DB satırları: kısmi override'lar. */
export type SeoOverrides = {
  settings: { [K in SettingsKey]?: DeepPartial<SeoSettings[K]> }
  pages: Record<string, DeepPartial<PageSeo>>
  redirects: SeoRedirect[]
  /** 'settings:key' / 'page:path' → ISO zaman; panelde ve sitemap lastmod'da kullanılır. */
  updatedAt?: Record<string, string>
}

/** Efektif paket: varsayılan + override birleşimi (render bununla yapılır). */
export type SeoBundle = {
  settings: SeoSettings
  pages: Record<string, PageSeo>
  redirects: SeoRedirect[]
}

/** Bir sayfanın render edilecek nihai meta seti (/api/seo/meta yanıtı). */
export type ResolvedPageMeta = {
  path: string
  title: string
  description: string
  canonical: string
  robots: string
  ogTitle: string
  ogDescription: string
  ogImage: string
  ogImageAlt: string
  ogUrl: string
  ogSiteName: string
  ogLocale: string
  twitterSite: string
  themeColor: string
  verification: { google: string; bing: string; yandex: string }
  /** Sayfada basılacak TÜM JSON-LD blokları (global + sayfa). */
  jsonld: Record<string, unknown>[]
  /** Ana sayfa SSS bölümü için (showOnLanding && items.length). */
  faq: { title: string; intro: string; items: FaqItem[] } | null
  /** Blog yazılarında 'article' — opsiyonel alanlar panel tipini bozmaz. */
  ogType?: 'website' | 'article'
  publishedAt?: string
  modifiedAt?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DeepPartial<T> = T extends (infer U)[]
  ? T
  : T extends Record<string, any>
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T

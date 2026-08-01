import MarkdownIt from 'markdown-it'
import { trSlug } from '#shared/utils/turkish'
import type {
  SupportArticle,
  SupportArticleSummary,
  SupportCategory,
  SupportHeading,
  SupportSearchRow,
} from '#shared/types/support'
import { parseFrontmatter, toList } from './frontmatter'
import { SUPPORT_CATEGORIES } from './supportCategories'

/**
 * Destek merkezi içerik katmanı.
 *
 * Yazılar `content/destek/<kategori>/<slug>.md` dosyalarında yaşar ve Nitro
 * server asset'i olarak paketlenir (nuxt.config > nitro.serverAssets). Yani
 * veritabanı YOKTUR: dokümantasyon ürünle birlikte sürümlenir, development ve
 * staging ortamlarında da doludur, arama dizini istekte bellekten üretilir.
 *
 * Blogun aksine burada kaynak dosyadır, veritabanı değil. Bir yazıyı yayına
 * almak = dosyayı commit'leyip deploy etmek.
 */

// html:false KRİTİK: markdown içindeki ham HTML escape edilir, çıktı v-html ile
// basıldığı hâlde script enjeksiyonu imkânsız kalır (blogdaki kuralın aynısı).
const md = new MarkdownIt({ html: false, linkify: true, typographer: false })
// Kutuların İÇİ ayrı bir örnekle render edilir: fence kuralı iç içe girmesin.
const mdCallout = new MarkdownIt({ html: false, linkify: true, typographer: false })

/**
 * Destek yazılarına özel blok ögeleri. markdown-it eklentisi eklemeden,
 * çitli blokların bilgi satırını kullanarak:
 *
 *   ```ipucu / ```dikkat  → yanına açıklama kutusu
 *   ```yol                → "Profil > Hesap > Hesabı sil" gezinme satırı
 *
 * Bilinmeyen bir bilgi satırı düz kod bloğu olarak basılır (sessiz kaybolmaz).
 * CSS sınıf adları Türkçe kalır: yazı sayfasının stil sözleşmesidir.
 */
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]!
  const kind = (token.info || '').trim().toLowerCase()
  const body = token.content

  if (kind === 'ipucu' || kind === 'dikkat') {
    const label = kind === 'ipucu' ? 'İpucu' : 'Dikkat'
    return (
      `<aside class="destek-kutu destek-kutu-${kind}">` +
      `<p class="destek-kutu-etiket">${label}</p>` +
      mdCallout.render(body) +
      '</aside>\n'
    )
  }

  if (kind === 'yol') {
    const steps = body
      .split('>')
      .map((part) => part.trim())
      .filter(Boolean)
    if (!steps.length) return ''
    const rendered = steps
      .map((step) => `<span class="destek-yol-adim">${md.utils.escapeHtml(step)}</span>`)
      .join('')
    return `<p class="destek-yol" role="note">${rendered}</p>\n`
  }

  return `<pre class="destek-kod"><code>${md.utils.escapeHtml(body)}</code></pre>\n`
}

// ── Gövde render'ı ───────────────────────────────────────────────────────────

/**
 * Gövdeyi HTML'e çevirirken h2/h3 başlıklarına id verir ve içindekiler
 * listesini toplar. Aynı başlık iki kez geçerse id'ye sayı eklenir; sağdaki
 * "Bu sayfada" listesi ile gövdedeki çapaların hep birebir eşleşmesi gerekir.
 */
function renderBody(source: string): { html: string; toc: SupportHeading[] } {
  const env = {}
  const tokens = md.parse(source, env)
  const toc: SupportHeading[] = []
  const used = new Set<string>()

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    if (token.type !== 'heading_open') continue
    if (token.tag !== 'h2' && token.tag !== 'h3') continue

    const text = (tokens[i + 1]?.content ?? '').trim()
    if (!text) continue

    const base = trSlug(text) || 'baslik'
    let id = base
    let n = 2
    while (used.has(id)) id = `${base}-${n++}`
    used.add(id)

    token.attrSet('id', id)
    toc.push({ id, text, level: token.tag === 'h2' ? 2 : 3 })
  }

  return { html: md.renderer.render(tokens, md.options, env), toc }
}

/** Arama dizini ve llms-full.txt için: markdown işaretlerinden arınmış gövde. */
function plainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Depo ─────────────────────────────────────────────────────────────────────

type StoredArticle = {
  summary: SupportArticleSummary
  html: string
  toc: SupportHeading[]
  relatedKeys: string[]
  keywords: string[]
  plain: string
}

type Store = {
  categories: (SupportCategory & { articles: SupportArticleSummary[] })[]
  articles: Map<string, StoredArticle>
  search: SupportSearchRow[]
  /** Tüm yazıların en yenisi; sitemap lastmod'u için. */
  updated: string
}

let store: Store | null = null

/** Yazılar pakete gömülü olduğundan üretimde hiç değişmez; dev'de her istekte tazelenir. */
function isFresh(): boolean {
  return store !== null && !import.meta.dev
}

const articleKey = (category: string, slug: string) => `${category}/${slug}`

const FALLBACK_DATE = '2026-07-31'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

async function buildStore(): Promise<Store> {
  const storage = useStorage('assets:destek')
  const keys = await storage.getKeys()

  const articles = new Map<string, StoredArticle>()
  const byCategory = new Map<string, SupportArticleSummary[]>()

  for (const key of keys) {
    if (!key.endsWith('.md')) continue
    // Nitro asset anahtarı klasörü iki nokta ile ayırır: "baslangic:afiet-nedir.md"
    const parts = key.split(':')
    if (parts.length !== 2) continue
    const categorySlug = parts[0]!
    const file = parts[1]!
    if (!SUPPORT_CATEGORIES.some((c) => c.slug === categorySlug)) continue

    const raw = await storage.getItem(key)
    if (typeof raw !== 'string') continue
    const parsed = parseFrontmatter(raw)
    if (!parsed) continue

    const { fm, body } = parsed
    const title = fm.title?.trim()
    if (!title) continue

    const slug = fm.slug?.trim() || file.replace(/\.md$/, '')
    const updated = DATE_PATTERN.test(fm.updated ?? '') ? fm.updated! : FALLBACK_DATE
    const order = Number.parseInt(fm.order ?? '', 10)

    const { html, toc } = renderBody(body)
    const summary: SupportArticleSummary = {
      slug,
      category: categorySlug,
      title,
      summary: fm.description?.trim() ?? '',
      updated,
      order: Number.isFinite(order) ? order : 999,
    }

    articles.set(articleKey(categorySlug, slug), {
      summary,
      html,
      toc,
      relatedKeys: toList(fm.related),
      keywords: toList(fm.keywords),
      plain: plainText(body),
    })

    const list = byCategory.get(categorySlug) ?? []
    list.push(summary)
    byCategory.set(categorySlug, list)
  }

  // Sıra: frontmatter'daki `order`, eşitlikte Türkçe alfabetik başlık.
  for (const list of byCategory.values()) {
    list.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'tr'))
  }

  const categories = SUPPORT_CATEGORIES.map((category) => ({
    ...category,
    articles: byCategory.get(category.slug) ?? [],
  }))

  const search: SupportSearchRow[] = []
  let updated = ''
  for (const category of categories) {
    for (const article of category.articles) {
      const stored = articles.get(articleKey(article.category, article.slug))!
      search.push({
        k: article.category,
        s: article.slug,
        b: article.title,
        o: article.summary,
        // Küratörlü sinyal (kategori adı, ara başlıklar, anahtar kelimeler) ile
        // ham gövde AYRI tutulur: gövdede geçen bir kelime tek başına eşleşme
        // saymaz, yoksa "besin grubu" geçen her yazı "grup" aramasına düşer.
        a: [category.title, ...stored.toc.map((h) => h.text), ...stored.keywords].join(' '),
        // Dizin küçük kalsın diye tam gövde değil ilk 400 karakter.
        g: stored.plain.slice(0, 400),
      })
      if (article.updated > updated) updated = article.updated
    }
  }

  return { categories, articles, search, updated: updated || FALLBACK_DATE }
}

async function getStore(): Promise<Store> {
  if (!isFresh()) store = await buildStore()
  return store!
}

// ── Dışa açık okuma yüzeyi ───────────────────────────────────────────────────

export async function supportCategoriesWithArticles() {
  const { categories } = await getStore()
  return categories
}

export async function supportSearchIndex(): Promise<SupportSearchRow[]> {
  return (await getStore()).search
}

export async function getSupportArticle(
  categorySlug: string,
  slug: string,
): Promise<SupportArticle | null> {
  const { categories, articles } = await getStore()
  const stored = articles.get(articleKey(categorySlug, slug))
  if (!stored) return null

  const category = categories.find((c) => c.slug === categorySlug)
  const siblings = category?.articles ?? []
  const i = siblings.findIndex((a) => a.slug === slug)

  // İlgili yazılar: frontmatter belirtmişse o, yoksa aynı kategorideki komşular.
  const picked = stored.relatedKeys
    .map((path) => articles.get(path.replace(/^\/+|\/+$/g, ''))?.summary)
    .filter((a): a is SupportArticleSummary => Boolean(a))
  const related = (
    picked.length ? picked : siblings.filter((a) => a.slug !== slug)
  ).slice(0, 3)

  return {
    ...stored.summary,
    html: stored.html,
    toc: stored.toc,
    previous: i > 0 ? siblings[i - 1]! : null,
    next: i >= 0 && i < siblings.length - 1 ? siblings[i + 1]! : null,
    related,
  }
}

/** sitemap.xml için tüm destek yolları (kategoriler + yazılar). */
export async function supportSitemapUrls(
  base: string,
): Promise<{ loc: string; lastmod?: string }[]> {
  const { categories, updated } = await getStore()
  const urls: { loc: string; lastmod?: string }[] = []
  for (const category of categories) {
    if (!category.articles.length) continue
    const newest = category.articles.reduce((a, x) => (x.updated > a ? x.updated : a), '')
    urls.push({ loc: `${base}/destek/${category.slug}`, lastmod: newest || updated })
    for (const article of category.articles) {
      urls.push({
        loc: `${base}/destek/${category.slug}/${article.slug}`,
        lastmod: article.updated,
      })
    }
  }
  return urls
}

/** llms.txt'nin destek bölümü: kategori başlıkları altında yazı bağlantıları. */
export async function supportLlmsSection(base: string): Promise<string> {
  const { categories } = await getStore()
  const lines: string[] = ['## Destek merkezi', '']
  lines.push(
    `Kullanım soruları ve sorun giderme: [${base}/destek](${base}/destek). ` +
      'Yazıların tam metni ' +
      `[${base}/llms-full.txt](${base}/llms-full.txt) adresindedir.`,
    '',
  )
  for (const category of categories) {
    if (!category.articles.length) continue
    lines.push(`### ${category.title}`)
    for (const article of category.articles) {
      const tail = article.summary ? `: ${article.summary}` : ''
      lines.push(
        `- [${article.title}](${base}/destek/${category.slug}/${article.slug})${tail}`,
      )
    }
    lines.push('')
  }
  return lines.join('\n')
}

/** llms-full.txt: tüm destek gövdesi tek dosyada, düz metin. */
export async function supportLlmsFull(base: string): Promise<string> {
  const { categories, articles, updated } = await getStore()
  const parts: string[] = [
    '# afiet destek merkezi (tam metin)',
    '',
    `> afiet uygulamasının kullanım dokümantasyonunun tamamı. Kaynak: ${base}/destek`,
    `> Son güncelleme: ${updated}`,
    '',
  ]
  for (const category of categories) {
    if (!category.articles.length) continue
    parts.push(`## ${category.title}`, '', category.description, '')
    for (const article of category.articles) {
      const stored = articles.get(articleKey(article.category, article.slug))!
      parts.push(
        `### ${article.title}`,
        `URL: ${base}/destek/${category.slug}/${article.slug}`,
        article.summary ? `Özet: ${article.summary}` : '',
        '',
        stored.plain,
        '',
      )
    }
  }
  return parts.join('\n')
}

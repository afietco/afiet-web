import MarkdownIt from 'markdown-it'
import type { ReleaseNote, ReleaseSection, ReleaseSummary } from '#shared/types/release'
import { parseFrontmatter } from './frontmatter'

/**
 * Sürüm notları içerik katmanı (`/yenilikler`).
 *
 * Notlar `content/yenilikler/<sürüm>.md` dosyalarında yaşar ve destek merkezi
 * gibi Nitro server asset'i olarak paketlenir (nuxt.config > nitro.serverAssets).
 * Veritabanı YOKTUR: sürüm notu ürünle birlikte sürümlenir ve PR'da gözden
 * geçirilir. Yayına almak = commit + deploy.
 *
 * Sayfanın uygulama içindeki karşılığı mobildeki "Yenilikler" alt sayfasıdır
 * (afiet-mobile > features/changelog). Orası kısa özeti gösterir ve buraya
 * bağlanır; yani BURASI, ilgili sürüm mağazaya çıkmadan ÖNCE yayında olmak
 * zorundadır, yoksa uygulamadaki bağlantı boşa düşer.
 */

// html:false KRİTİK: markdown içindeki ham HTML escape edilir, çıktı v-html ile
// basıldığı hâlde script enjeksiyonu imkânsız kalır (blog ve destekteki kural).
const md = new MarkdownIt({ html: false, linkify: true, typographer: false })

/** `0.10.0` gibi üç parçalı sürüm; dosya adı ve URL parçası da budur. */
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Sürüm sırası SÖZLÜK sırası değildir: "0.9.0" > "0.10.0" olurdu, yani en yeni
 * sürüm listenin ortasına düşerdi. Parça parça sayısal karşılaştırılır.
 */
export function compareVersions(a: string, b: string): number {
  const x = a.split('.').map(Number)
  const y = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (x[i] ?? 0) - (y[i] ?? 0)
    if (diff) return diff
  }
  return 0
}

/**
 * Gövdedeki `## Başlık` bölümlerinin madde sayısı. Liste sayfasındaki
 * "12 yenilik · 8 düzeltme" rozetleri buradan gelir; HTML'i ayrıştırmak yerine
 * kaynağı saymak hem ucuz hem de biçim değişikliğine dayanıklı.
 */
function countSections(body: string): { sections: ReleaseSection[]; total: number } {
  const sections: ReleaseSection[] = []
  let current: ReleaseSection | null = null
  for (const line of body.split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(line)
    if (heading) {
      current = { heading: heading[1]!, count: 0 }
      sections.push(current)
      continue
    }
    if (current && /^\s*-\s+\S/.test(line)) current.count++
  }
  const kept = sections.filter((s) => s.count > 0)
  return { sections: kept, total: kept.reduce((n, s) => n + s.count, 0) }
}

/** llms çıktıları için: markdown işaretlerinden arınmış gövde. */
function plainText(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

type StoredRelease = { summary: ReleaseSummary; html: string; plain: string }

type Store = {
  /** En yeni sürüm başta. */
  order: ReleaseSummary[]
  releases: Map<string, StoredRelease>
}

let store: Store | null = null

/** Notlar pakete gömülü olduğundan üretimde hiç değişmez; dev'de her istekte tazelenir. */
function isFresh(): boolean {
  return store !== null && !import.meta.dev
}

async function buildStore(): Promise<Store> {
  const storage = useStorage('assets:yenilikler')
  const keys = await storage.getKeys()

  const releases = new Map<string, StoredRelease>()

  for (const key of keys) {
    if (!key.endsWith('.md')) continue
    const raw = await storage.getItem(key)
    if (typeof raw !== 'string') continue
    const parsed = parseFrontmatter(raw)
    if (!parsed) continue

    const { fm, body } = parsed
    // Sürüm ve tarih dosya adından TÜRETİLMEZ: frontmatter tek gerçektir, biçimi
    // tutmayan dosya sessizce yanlış sıralanmaktansa hiç yayınlanmaz.
    const version = fm.version?.trim() ?? ''
    const date = fm.date?.trim() ?? ''
    const title = fm.title?.trim() ?? ''
    if (!VERSION_PATTERN.test(version) || !DATE_PATTERN.test(date) || !title) continue
    // Taslak script'inin bıraktığı TODO satırları doldurulmadan yayına çıkmaz.
    if (title.startsWith('TODO') || body.startsWith('TODO')) continue

    const { sections, total } = countSections(body)
    releases.set(version, {
      summary: {
        version,
        date,
        title,
        summary: fm.summary?.trim() ?? '',
        sections,
        total,
      },
      html: md.render(body),
      plain: plainText(body),
    })
  }

  const order = [...releases.values()]
    .map((r) => r.summary)
    .sort((a, b) => compareVersions(b.version, a.version))

  return { order, releases }
}

async function getStore(): Promise<Store> {
  if (!isFresh()) store = await buildStore()
  return store!
}

// ── Dışa açık okuma yüzeyi ───────────────────────────────────────────────────

export async function releaseSummaries(): Promise<ReleaseSummary[]> {
  return (await getStore()).order
}

export async function getRelease(version: string): Promise<ReleaseNote | null> {
  const { order, releases } = await getStore()
  const stored = releases.get(version)
  if (!stored) return null

  const i = order.findIndex((r) => r.version === version)
  return {
    ...stored.summary,
    html: stored.html,
    newer: i > 0 ? order[i - 1]! : null,
    older: i >= 0 && i < order.length - 1 ? order[i + 1]! : null,
  }
}

/** sitemap.xml için tüm sürüm yolları. */
export async function releaseSitemapUrls(
  base: string,
): Promise<{ loc: string; lastmod?: string }[]> {
  const { order } = await getStore()
  return order.map((r) => ({ loc: `${base}/yenilikler/${r.version}`, lastmod: r.date }))
}

/** llms.txt'nin sürüm bölümü: elle güncellenen bir liste kaçınılmaz olarak eskir. */
export async function releaseLlmsSection(base: string): Promise<string> {
  const { order } = await getStore()
  if (!order.length) return ''
  const lines = [
    '## Sürüm notları',
    '',
    `afiet mobil uygulamasının sürüm geçmişi: [${base}/yenilikler](${base}/yenilikler).`,
    '',
  ]
  // En yeni on sürüm: liste dosyası şişmesin, eskisi sayfadan okunur.
  for (const r of order.slice(0, 10)) {
    lines.push(`- [${r.version} · ${r.title}](${base}/yenilikler/${r.version}) (${r.date})`)
  }
  lines.push('')
  return lines.join('\n')
}

import MarkdownIt from 'markdown-it'
import type { HesapFaqItem, HesapIcerik, HesapSection } from '#shared/types/hesap-icerik'
import { trSlug } from '#shared/utils/turkish'
import { parseFrontmatter } from './frontmatter'

/**
 * Hesaplama araçlarının uzun içerik katmanı (`/hesapla/<slug>`).
 *
 * Metinler `content/hesapla/<slug>.md` dosyalarında yaşar ve destek merkezi ile
 * sürüm notları gibi Nitro server asset'i olarak paketlenir
 * (nuxt.config > nitro.serverAssets). Veritabanı YOKTUR: içerik hesabın kendisiyle
 * birlikte sürümlenir ve PR'da gözden geçirilir. Yayına almak = commit + deploy.
 *
 * NEDEN VAR: bu beş sayfa sitenin en yüksek arama talebi olan adresleriydi ama
 * hesap istemcide döndüğü için sunucudan 101-145 kelime çıkıyordu, yani arama
 * motoru boş sayfa görüyordu. Uzun içerik BURADAN gelir ve SSR'da HTML'in içinde
 * basılır; katlanmış durması indekslenmesine engel değildir.
 *
 * SÖZLEŞME: gövde yalnız `## Başlık` bölümlerinden oluşur. Başlığı tam olarak
 * `Sık sorulanlar` olan bölüm SSS'dir ve `**Soru?**` + cevap çiftlerine ayrılır;
 * geri kalanı katlanır panel olur. Başlık tutmuyorsa SSS boş döner ve FAQPage
 * şeması basılmaz - uydurma şema basmaktansa hiç basmamak yeğdir.
 */

// html:false KRİTİK: markdown içindeki ham HTML escape edilir, çıktı v-html ile
// basıldığı hâlde script enjeksiyonu imkânsız kalır (blog, destek ve sürüm
// notlarındaki kuralın aynısı).
const md = new MarkdownIt({ html: false, linkify: true, typographer: false })

/** SSS bölümünün başlığı; tam eşleşme aranır. */
const FAQ_HEADING = 'Sık sorulanlar'

type RawSection = { title: string; body: string }

/** Gövdeyi `## Başlık` sınırlarından böler. Başlıktan önceki metin YOK SAYILIR. */
function splitSections(body: string): RawSection[] {
  const sections: RawSection[] = []
  let current: RawSection | null = null
  for (const line of body.split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(line)
    if (heading) {
      current = { title: heading[1]!, body: '' }
      sections.push(current)
      continue
    }
    if (current) current.body += `${line}\n`
  }
  return sections.filter((s) => s.body.trim())
}

/**
 * SSS gövdesini soru/cevap çiftlerine ayırır. Biçim:
 * `**Soru?**` satırı, ardından bir ya da daha çok cevap satırı, sonra boş satır.
 *
 * Cevap DÜZ METİN olarak tutulur çünkü aynı metin JSON-LD'ye giriyor; orada
 * HTML etiketi istemiyoruz ve şema ile ekranda görünen cevabın aynı kaynaktan
 * gelmesi CLAUDE.md'nin kuralı.
 */
function parseFaq(body: string): HesapFaqItem[] {
  const items: HesapFaqItem[] = []
  let current: HesapFaqItem | null = null
  for (const line of body.split('\n')) {
    const question = /^\*\*(.+?)\*\*\s*$/.exec(line.trim())
    if (question) {
      current = { q: question[1]!, a: '' }
      items.push(current)
      continue
    }
    if (!current) continue
    const text = line.trim()
    if (!text) continue
    current.a = current.a ? `${current.a} ${text}` : text
  }
  return items.filter((it) => it.q && it.a)
}

type Store = Map<string, HesapIcerik>

let store: Store | null = null

/** İçerik pakete gömülü olduğundan üretimde hiç değişmez; dev'de her istekte tazelenir. */
function isFresh(): boolean {
  return store !== null && !import.meta.dev
}

async function buildStore(): Promise<Store> {
  const storage = useStorage('assets:hesapla')
  const keys = await storage.getKeys()
  const next: Store = new Map()

  for (const key of keys) {
    if (!key.endsWith('.md')) continue
    const raw = await storage.getItem(key)
    if (typeof raw !== 'string') continue
    const parsed = parseFrontmatter(raw)
    if (!parsed) continue

    const { fm, body } = parsed
    // Slug frontmatter'dan gelir, dosya adından TÜRETİLMEZ: sözleşme sürüm
    // notlarındakiyle aynı, biçimi tutmayan dosya sessizce yanlış yere
    // bağlanmaktansa hiç yayınlanmaz.
    const slug = fm.slug?.trim() ?? ''
    if (!slug) continue

    const sections: HesapSection[] = []
    let faq: HesapFaqItem[] = []
    const used = new Set<string>()

    for (const section of splitSections(body)) {
      if (section.title === FAQ_HEADING) {
        faq = parseFaq(section.body)
        continue
      }
      let id = trSlug(section.title)
      let n = 2
      while (used.has(id)) id = `${trSlug(section.title)}-${n++}`
      used.add(id)
      sections.push({ id, title: section.title, html: md.render(section.body.trim()) })
    }

    if (!sections.length && !faq.length) continue
    next.set(slug, { slug, sections, faq })
  }

  return next
}

async function getStore(): Promise<Store> {
  if (!isFresh()) store = await buildStore()
  return store!
}

// ── Dışa açık okuma yüzeyi ───────────────────────────────────────────────────

export async function getHesapIcerik(slug: string): Promise<HesapIcerik | null> {
  return (await getStore()).get(slug) ?? null
}

/**
 * FAQPage şeması için yalnız soru/cevap listesi. Boş dizi = şema basılmaz.
 *
 * NOT: Google FAQ zengin sonucunu Ağustos 2023'te kamu ve sağlık siteleriyle
 * sınırladı, yani bu şema SERP'te görsel kazanç getirmez. Yine de basıyoruz:
 * llms.txt ile birlikte yapay zekâ motorlarının soruyu doğru cevapla
 * eşleştirmesine yarıyor (panelin adı da bu yüzden "SEO & GEO").
 */
export async function hesapFaqItems(slug: string): Promise<HesapFaqItem[]> {
  return (await getHesapIcerik(slug))?.faq ?? []
}

import MarkdownIt from 'markdown-it'
import { trSlug } from '#shared/utils/turkce'
import type {
  DestekAramaSatiri,
  DestekBaslik,
  DestekKategori,
  DestekYazi,
  DestekYaziOzet,
} from '#shared/types/destek'
import { DESTEK_KATEGORILER } from './destekKategori'

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
const mdKutu = new MarkdownIt({ html: false, linkify: true, typographer: false })

/**
 * Destek yazılarına özel blok ögeleri. markdown-it eklentisi eklemeden,
 * çitli blokların bilgi satırını kullanarak:
 *
 *   ```ipucu / ```dikkat  → yanına açıklama kutusu
 *   ```yol                → "Profil > Hesap > Hesabı sil" gezinme satırı
 *
 * Bilinmeyen bir bilgi satırı düz kod bloğu olarak basılır (sessiz kaybolmaz).
 */
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx]!
  const tur = (token.info || '').trim().toLowerCase()
  const govde = token.content

  if (tur === 'ipucu' || tur === 'dikkat') {
    const etiket = tur === 'ipucu' ? 'İpucu' : 'Dikkat'
    return (
      `<aside class="destek-kutu destek-kutu-${tur}">` +
      `<p class="destek-kutu-etiket">${etiket}</p>` +
      mdKutu.render(govde) +
      '</aside>\n'
    )
  }

  if (tur === 'yol') {
    const adimlar = govde
      .split('>')
      .map((p) => p.trim())
      .filter(Boolean)
    if (!adimlar.length) return ''
    const parcalar = adimlar
      .map((a) => `<span class="destek-yol-adim">${md.utils.escapeHtml(a)}</span>`)
      .join('')
    return `<p class="destek-yol" role="note">${parcalar}</p>\n`
  }

  return `<pre class="destek-kod"><code>${md.utils.escapeHtml(govde)}</code></pre>\n`
}

// ── Frontmatter ──────────────────────────────────────────────────────────────

type Frontmatter = Record<string, string>

/** Blogdaki (`scripts/publish-post.mjs`) sözleşmenin aynısı: düz `anahtar: değer`. */
function ayirFrontmatter(ham: string): { fm: Frontmatter; govde: string } | null {
  if (!ham.startsWith('---')) return null
  const son = ham.indexOf('\n---', 3)
  if (son === -1) return null

  const bas = ham.slice(ham.indexOf('\n') + 1, son)
  const govde = ham.slice(ham.indexOf('\n', son + 1) + 1).trim()

  const fm: Frontmatter = {}
  for (const satir of bas.split('\n')) {
    if (!satir.trim() || satir.trim().startsWith('#')) continue
    const i = satir.indexOf(':')
    if (i === -1) continue
    const anahtar = satir.slice(0, i).trim()
    let deger = satir.slice(i + 1).trim()
    if (
      (deger.startsWith('"') && deger.endsWith('"')) ||
      (deger.startsWith("'") && deger.endsWith("'"))
    ) {
      deger = deger.slice(1, -1)
    }
    fm[anahtar] = deger
  }
  return { fm, govde }
}

/** `[a, b, c]` ya da `a, b, c` biçimini diziye çevirir. */
function listeye(deger: string | undefined): string[] {
  return (deger ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((p) => p.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

// ── Gövde render'ı ───────────────────────────────────────────────────────────

/**
 * Gövdeyi HTML'e çevirirken h2/h3 başlıklarına id verir ve içindekiler
 * listesini toplar. Aynı başlık iki kez geçerse id'ye sayı eklenir; sağdaki
 * "Bu sayfada" listesi ile gövdedeki çapaların hep birebir eşleşmesi gerekir.
 */
function renderGovde(kaynak: string): { html: string; icindekiler: DestekBaslik[] } {
  const env = {}
  const tokenlar = md.parse(kaynak, env)
  const icindekiler: DestekBaslik[] = []
  const kullanilan = new Set<string>()

  for (let i = 0; i < tokenlar.length; i++) {
    const token = tokenlar[i]!
    if (token.type !== 'heading_open') continue
    if (token.tag !== 'h2' && token.tag !== 'h3') continue

    const metin = (tokenlar[i + 1]?.content ?? '').trim()
    if (!metin) continue

    const taban = trSlug(metin) || 'baslik'
    let id = taban
    let n = 2
    while (kullanilan.has(id)) id = `${taban}-${n++}`
    kullanilan.add(id)

    token.attrSet('id', id)
    icindekiler.push({ id, metin, seviye: token.tag === 'h2' ? 2 : 3 })
  }

  return { html: md.renderer.render(tokenlar, md.options, env), icindekiler }
}

/** Arama dizini ve llms-full.txt için: markdown işaretlerinden arınmış gövde. */
function duzMetin(kaynak: string): string {
  return kaynak
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Depo ─────────────────────────────────────────────────────────────────────

type TamYazi = {
  ozet: DestekYaziOzet
  html: string
  icindekiler: DestekBaslik[]
  ilgiliAnahtarlar: string[]
  anahtarKelimeler: string[]
  duz: string
}

type Depo = {
  kategoriler: (DestekKategori & { yazilar: DestekYaziOzet[] })[]
  yazilar: Map<string, TamYazi>
  arama: DestekAramaSatiri[]
  /** Tüm yazıların en yenisi; sitemap lastmod'u için. */
  guncelleme: string
}

let depo: Depo | null = null

/** Yazılar pakete gömülü olduğundan üretimde hiç değişmez; dev'de her istekte tazelenir. */
function tazeMi(): boolean {
  return depo !== null && !import.meta.dev
}

const yaziAnahtari = (kategori: string, slug: string) => `${kategori}/${slug}`

const BUGUN_YEDEK = '2026-07-31'
const TARIH_DESENI = /^\d{4}-\d{2}-\d{2}$/

async function depoyuKur(): Promise<Depo> {
  const kaynak = useStorage('assets:destek')
  const anahtarlar = await kaynak.getKeys()

  const yazilar = new Map<string, TamYazi>()
  const kategoriYazilari = new Map<string, DestekYaziOzet[]>()

  for (const anahtar of anahtarlar) {
    if (!anahtar.endsWith('.md')) continue
    // Nitro asset anahtarı klasörü iki nokta ile ayırır: "baslangic:afiet-nedir.md"
    const parcalar = anahtar.split(':')
    if (parcalar.length !== 2) continue
    const kategoriSlug = parcalar[0]!
    const dosya = parcalar[1]!
    if (!DESTEK_KATEGORILER.some((k) => k.slug === kategoriSlug)) continue

    const ham = await kaynak.getItem(anahtar)
    if (typeof ham !== 'string') continue
    const ayrilmis = ayirFrontmatter(ham)
    if (!ayrilmis) continue

    const { fm, govde } = ayrilmis
    const baslik = fm.title?.trim()
    if (!baslik) continue

    const slug = fm.slug?.trim() || dosya.replace(/\.md$/, '')
    const guncelleme = TARIH_DESENI.test(fm.updated ?? '') ? fm.updated! : BUGUN_YEDEK
    const sira = Number.parseInt(fm.order ?? '', 10)

    const { html, icindekiler } = renderGovde(govde)
    const ozet: DestekYaziOzet = {
      slug,
      kategori: kategoriSlug,
      baslik,
      ozet: fm.description?.trim() ?? '',
      guncelleme,
      sira: Number.isFinite(sira) ? sira : 999,
    }

    yazilar.set(yaziAnahtari(kategoriSlug, slug), {
      ozet,
      html,
      icindekiler,
      ilgiliAnahtarlar: listeye(fm.related),
      anahtarKelimeler: listeye(fm.keywords),
      duz: duzMetin(govde),
    })

    const liste = kategoriYazilari.get(kategoriSlug) ?? []
    liste.push(ozet)
    kategoriYazilari.set(kategoriSlug, liste)
  }

  // Sıra: frontmatter'daki `order`, eşitlikte Türkçe alfabetik başlık.
  for (const liste of kategoriYazilari.values()) {
    liste.sort((a, b) => a.sira - b.sira || a.baslik.localeCompare(b.baslik, 'tr'))
  }

  const kategoriler = DESTEK_KATEGORILER.map((k) => ({
    ...k,
    yazilar: kategoriYazilari.get(k.slug) ?? [],
  }))

  const arama: DestekAramaSatiri[] = []
  let guncelleme = ''
  for (const k of kategoriler) {
    for (const y of k.yazilar) {
      const tam = yazilar.get(yaziAnahtari(y.kategori, y.slug))!
      arama.push({
        k: y.kategori,
        s: y.slug,
        b: y.baslik,
        o: y.ozet,
        // Küratörlü sinyal (kategori adı, ara başlıklar, anahtar kelimeler) ile
        // ham gövde AYRI tutulur: gövdede geçen bir kelime tek başına eşleşme
        // saymaz, yoksa "besin grubu" geçen her yazı "grup" aramasına düşer.
        a: [k.baslik, ...tam.icindekiler.map((b) => b.metin), ...tam.anahtarKelimeler].join(' '),
        // Dizin küçük kalsın diye tam gövde değil ilk 400 karakter.
        g: tam.duz.slice(0, 400),
      })
      if (y.guncelleme > guncelleme) guncelleme = y.guncelleme
    }
  }

  return { kategoriler, yazilar, arama, guncelleme: guncelleme || BUGUN_YEDEK }
}

async function getDepo(): Promise<Depo> {
  if (!tazeMi()) depo = await depoyuKur()
  return depo!
}

// ── Dışa açık okuma yüzeyi ───────────────────────────────────────────────────

export async function destekKategorileri() {
  const { kategoriler } = await getDepo()
  return kategoriler
}

export async function destekAramaDizini(): Promise<DestekAramaSatiri[]> {
  return (await getDepo()).arama
}

export async function destekYaziGetir(
  kategoriSlug: string,
  slug: string,
): Promise<DestekYazi | null> {
  const { kategoriler, yazilar } = await getDepo()
  const tam = yazilar.get(yaziAnahtari(kategoriSlug, slug))
  if (!tam) return null

  const kategori = kategoriler.find((k) => k.slug === kategoriSlug)
  const komsular = kategori?.yazilar ?? []
  const i = komsular.findIndex((y) => y.slug === slug)

  // İlgili yazılar: frontmatter belirtmişse o, yoksa aynı kategorideki komşular.
  const secilen = tam.ilgiliAnahtarlar
    .map((yol) => yazilar.get(yol.replace(/^\/+|\/+$/g, ''))?.ozet)
    .filter((y): y is DestekYaziOzet => Boolean(y))
  const ilgili = (
    secilen.length ? secilen : komsular.filter((y) => y.slug !== slug)
  ).slice(0, 3)

  return {
    ...tam.ozet,
    html: tam.html,
    icindekiler: tam.icindekiler,
    onceki: i > 0 ? komsular[i - 1]! : null,
    sonraki: i >= 0 && i < komsular.length - 1 ? komsular[i + 1]! : null,
    ilgili,
  }
}

/** sitemap.xml için tüm destek yolları (hub + kategoriler + yazılar). */
export async function destekSitemapYollari(
  base: string,
): Promise<{ loc: string; lastmod?: string }[]> {
  const { kategoriler, guncelleme } = await getDepo()
  const yollar: { loc: string; lastmod?: string }[] = []
  for (const k of kategoriler) {
    if (!k.yazilar.length) continue
    const enYeni = k.yazilar.reduce((a, y) => (y.guncelleme > a ? y.guncelleme : a), '')
    yollar.push({ loc: `${base}/destek/${k.slug}`, lastmod: enYeni || guncelleme })
    for (const y of k.yazilar) {
      yollar.push({ loc: `${base}/destek/${k.slug}/${y.slug}`, lastmod: y.guncelleme })
    }
  }
  return yollar
}

/** llms.txt'nin destek bölümü: kategori başlıkları altında yazı bağlantıları. */
export async function destekLlmsBolumu(base: string): Promise<string> {
  const { kategoriler } = await getDepo()
  const satirlar: string[] = ['## Destek merkezi', '']
  satirlar.push(
    `Kullanım soruları ve sorun giderme: [${base}/destek](${base}/destek). ` +
      'Yazıların tam metni ' +
      `[${base}/llms-full.txt](${base}/llms-full.txt) adresindedir.`,
    '',
  )
  for (const k of kategoriler) {
    if (!k.yazilar.length) continue
    satirlar.push(`### ${k.baslik}`)
    for (const y of k.yazilar) {
      const kuyruk = y.ozet ? `: ${y.ozet}` : ''
      satirlar.push(`- [${y.baslik}](${base}/destek/${k.slug}/${y.slug})${kuyruk}`)
    }
    satirlar.push('')
  }
  return satirlar.join('\n')
}

/** llms-full.txt: tüm destek gövdesi tek dosyada, düz metin. */
export async function destekLlmsFull(base: string): Promise<string> {
  const { kategoriler, yazilar, guncelleme } = await getDepo()
  const parcalar: string[] = [
    '# afiet destek merkezi (tam metin)',
    '',
    `> afiet uygulamasının kullanım dokümantasyonunun tamamı. Kaynak: ${base}/destek`,
    `> Son güncelleme: ${guncelleme}`,
    '',
  ]
  for (const k of kategoriler) {
    if (!k.yazilar.length) continue
    parcalar.push(`## ${k.baslik}`, '', k.aciklama, '')
    for (const y of k.yazilar) {
      const tam = yazilar.get(yaziAnahtari(y.kategori, y.slug))!
      parcalar.push(
        `### ${y.baslik}`,
        `URL: ${base}/destek/${k.slug}/${y.slug}`,
        y.ozet ? `Özet: ${y.ozet}` : '',
        '',
        tam.duz,
        '',
      )
    }
  }
  return parcalar.filter((p) => p !== undefined).join('\n')
}

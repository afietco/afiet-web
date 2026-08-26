import { supportLlmsAnswers } from '~~/server/utils/supportStore'
import { getSeoBundle } from '~~/server/utils/seoStore'
import { getPublishedPosts } from '~~/server/utils/contentStore'
import { getHesapIcerik } from '~~/server/utils/hesaplaStore'
import { answerOpening, htmlPlain, mdPlain } from '~~/server/utils/answerDigest'
import { DEFAULT_PAGES } from '~~/server/utils/seoDefaults'
import { blogPath } from '#shared/utils/locales'

/**
 * llms-full.txt - sitedeki her sorunun DOĞRUDAN CEVABI ve kanonik adresi.
 *
 * Dosya adı `.get.ts` DEĞİL: HEAD isteği 404 dönüyordu, gerekçe
 * `server/routes/robots.txt.ts` başında.
 *
 * 26 Ağustos 2026'ya kadar bu dosya destek merkezinin TAM METNİYDİ: 200 KB,
 * 14 günde sıfır istek, ve blog ile hesaplama araçlarını hiç taşımıyordu. Yani
 * en çok yeri kaplayan kısım en az arananıydı, en çok aranan kısım ise hiç
 * yoktu. Yeni sözleşme üç yüzeyi birden taşır ama her maddeden yalnız cevabı
 * alır; tam gövdeyi isteyen yanındaki adresi çeker.
 *
 * Neden cevap: ChatGPT 8 Ağustos 2026'dan beri standart web aramasının üstüne
 * "şu domaine sor" tipi ikinci bir sorgu yığıyor. O sorguyu karşılayan şey
 * sayfanın var olması değil, sorunun cevabını veriyor olması. Ayrıntı:
 * `research/2026-08-26-chatgpt-iki-kapi-brief.md`.
 *
 * llms.txt ile aynı anahtardan kapatılır: panel llms'i kapattıysa bu da 404.
 */

/** `/hesapla` ve `/en/tools` altındaki araçlar; slug'lar içerik dosyasından. */
const TOOL_PATHS = ['/hesapla/', '/en/tools/']

export default defineEventHandler(async (event) => {
  const { settings } = await getSeoBundle(event)
  if (!settings.llms.enabled) {
    throw createError({ statusCode: 404, statusMessage: 'llms_kapali' })
  }
  const base = settings.general.baseUrl.replace(/\/$/, '')

  const [posts, support] = await Promise.all([
    getPublishedPosts(event),
    supportLlmsAnswers(base),
  ])

  const parts: string[] = [
    '# afiet: soruların doğrudan cevapları',
    '',
    '> Her madde bir başlık, o başlığın doğrudan cevabı ve cevabın kanonik',
    `> adresidir. Tam gövde için adresi çek. Kaynak: ${base}`,
    `> Son güncelleme: ${support.updated}`,
    '',
  ]

  // ── Blog: beslenme, porsiyon ve denge soruları ──────────────────────────
  // Yazının ilk cümleleri zaten cevabın kendisi olmak zorunda (içerik hattının
  // "cevap önce" kuralı), bu yüzden özet ayrıca üretilmez, açılış alınır.
  const byLang = { tr: 'Blog (Türkçe)', en: 'Blog (English)' } as const
  for (const lang of ['tr', 'en'] as const) {
    const rows = posts.filter((p) => p.lang === lang)
    if (!rows.length) continue
    parts.push(`## ${byLang[lang]}`, '')
    for (const post of rows) {
      parts.push(
        `- ${post.title}`,
        `  ${base}${blogPath(post.lang, post.slug)}`,
        `  ${answerOpening(mdPlain(post.contentMd))}`,
        '',
      )
    }
  }

  // ── Hesaplama araçları ──────────────────────────────────────────────────
  // Araç sayfalarının gövdesi HTML olarak saklanıyor; ilk bölümün metni
  // "bu araç ne yapar"ın cevabıdır.
  const toolLines: string[] = []
  for (const [path, page] of Object.entries(DEFAULT_PAGES)) {
    if (!TOOL_PATHS.some((prefix) => path.startsWith(prefix))) continue
    const slug = path.slice(path.lastIndexOf('/') + 1)
    const content = await getHesapIcerik(slug)
    const opening = content?.sections[0]?.html ? answerOpening(htmlPlain(content.sections[0].html)) : ''
    toolLines.push(
      `- ${page.title.replace(/\s*\|\s*afiet\s*$/, '')}`,
      `  ${base}${path}`,
      `  ${opening || page.description}`,
      '',
    )
  }
  if (toolLines.length) parts.push('## Hesaplama araçları', '', ...toolLines)

  parts.push(support.section)

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=900')
  return parts.join('\n')
})

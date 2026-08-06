import { supportLlmsSection } from '~~/server/utils/supportStore'
import { releaseLlmsSection } from '~~/server/utils/releaseStore'
import { getSeoBundle } from '~~/server/utils/seoStore'
import { DEFAULT_PAGES } from '~~/server/utils/seoDefaults'
import { EN_BY_TR } from '#shared/utils/locales'

/**
 * llms.txt (llmstxt.org) - içerik panelden düzenlenir, kapatılırsa 404.
 *
 * Destek merkezi, sürüm notları ve İngilizce sayfa bölümleri panelden GELMEZ,
 * sonuna otomatik eklenir: listeler deploy'la değişir ve elle güncellenen bir
 * liste kaçınılmaz olarak eskir (prod'da llms içeriğinin panel override'ı da
 * var; koddan eklemek o override'dan etkilenmez). Panelin düzenlediği metin
 * ne olursa olsun bu dizinler doğru kalır.
 */

/** İngilizce sayfa dizini: eşleme haritasından üretilir, elle liste tutulmaz. */
function englishSection(base: string): string {
  const links = Object.values(EN_BY_TR)
    .filter((p) => DEFAULT_PAGES[p])
    .map((p) => {
      const page = DEFAULT_PAGES[p]!
      const name = page.title.replace(/\s*\|\s*afiet\s*$/, '').replace(/^afiet \| /, 'Home: ')
      return `- [${name}](${base}${p}): ${page.description}`
    })
  if (!links.length) return ''
  return [
    '## English',
    '',
    'afiet in English ("Stop counting. Start balancing."): balanced eating without ' +
      'calorie counting, portions measured by hand (slices, bowls, handfuls), five food ' +
      'groups as colors, built for families. Born at the Turkish table; the app is ' +
      'currently in Turkish and an English version is on the way.',
    '',
    ...links,
  ].join('\n')
}

export default defineEventHandler(async (event) => {
  const { settings } = await getSeoBundle(event)
  if (!settings.llms.enabled) {
    throw createError({ statusCode: 404, statusMessage: 'llms_kapali' })
  }
  const base = settings.general.baseUrl.replace(/\/$/, '')
  const [supportSection, releaseSection] = await Promise.all([
    supportLlmsSection(base),
    releaseLlmsSection(base),
  ])
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return [settings.llms.content.trimEnd(), supportSection, releaseSection, englishSection(base)]
    .filter((part) => part.trim())
    .join('\n\n')
})

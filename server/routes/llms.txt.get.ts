import { supportLlmsSection } from '~~/server/utils/supportStore'
import { releaseLlmsSection } from '~~/server/utils/releaseStore'
import { getSeoBundle } from '~~/server/utils/seoStore'

/**
 * llms.txt (llmstxt.org) - içerik panelden düzenlenir, kapatılırsa 404.
 *
 * Destek merkezi ve sürüm notları bölümleri panelden GELMEZ, sonuna otomatik
 * eklenir: iki liste de her deploy'da değişir ve elle güncellenen bir liste
 * kaçınılmaz olarak eskir. Panelin düzenlediği metin ne olursa olsun bu iki
 * dizin doğru kalır.
 */
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
  return [settings.llms.content.trimEnd(), supportSection, releaseSection]
    .filter((part) => part.trim())
    .join('\n\n')
})

import { supportLlmsSection } from '~~/server/utils/supportStore'
import { getSeoBundle } from '~~/server/utils/seoStore'

/**
 * llms.txt (llmstxt.org) - içerik panelden düzenlenir, kapatılırsa 404.
 *
 * Destek merkezi bölümü panelden GELMEZ, sonuna otomatik eklenir: yazı listesi
 * her deploy'da değişir ve elle güncellenen bir liste kaçınılmaz olarak eskir.
 * Panelin düzenlediği metin ne olursa olsun destek dizini doğru kalır.
 */
export default defineEventHandler(async (event) => {
  const { settings } = await getSeoBundle(event)
  if (!settings.llms.enabled) {
    throw createError({ statusCode: 404, statusMessage: 'llms_kapali' })
  }
  const base = settings.general.baseUrl.replace(/\/$/, '')
  const supportSection = await supportLlmsSection(base)
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return supportSection
    ? `${settings.llms.content.trimEnd()}\n\n${supportSection}`
    : settings.llms.content
})

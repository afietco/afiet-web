import { destekLlmsFull } from '~~/server/utils/destekStore'
import { getSeoBundle } from '~~/server/utils/seoStore'

/**
 * llms-full.txt - destek merkezinin TAM METNİ tek dosyada, düz metin.
 *
 * 2026 pratiği: llms.txt dizin, llms-full.txt gövde. Bir yapay zekâ ajanı
 * afiet'in nasıl kullanıldığını sorulduğunda tek istekle tüm dokümantasyona
 * ulaşsın diye; sayfa sayfa gezinmesi ya da HTML ayrıştırması gerekmesin.
 *
 * llms.txt ile aynı anahtardan kapatılır: panel llms'i kapattıysa bu da 404.
 */
export default defineEventHandler(async (event) => {
  const { settings } = await getSeoBundle(event)
  if (!settings.llms.enabled) {
    throw createError({ statusCode: 404, statusMessage: 'llms_kapali' })
  }
  const base = settings.general.baseUrl.replace(/\/$/, '')
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=900')
  return await destekLlmsFull(base)
})

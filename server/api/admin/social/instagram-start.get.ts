import { requireAdmin } from '~~/server/utils/adminAuth'
import { authorizeUrl, requireIgConfig } from '~~/server/utils/instagram'
import { signState } from '~~/server/utils/socialCrypto'

/**
 * Bağlama akışının 1. adımı: Instagram izin ekranının adresini üretir.
 * Panel bu adresi yeni sekmede açar (yönlendirmeyi biz yapmıyoruz ki panelin
 * oturumu bozulmasın).
 *
 * `state` HMAC'li ve zaman damgalıdır: callback'e dönen isteğin bizden çıktığı
 * doğrulanır (CSRF) ve 10 dakikadan eski bilet kabul edilmez.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const config = requireIgConfig(event)
  const state = await signState(event, `ig.${Date.now()}`)
  return { url: authorizeUrl(config, state), redirectUri: config.redirectUri }
})

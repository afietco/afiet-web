import { requireAdmin } from '~~/server/utils/adminAuth'
import { requireYtConfig, youtubeAuthorizeUrl } from '~~/server/utils/youtube'
import { signState } from '~~/server/utils/socialCrypto'

/**
 * YouTube bağlama akışının 1. adımı: Google izin ekranının adresini üretir.
 * Instagram'daki `instagram-start` ile aynı sözleşme (panel adresi yeni
 * sekmede açar, `state` HMAC'li ve 10 dakikalık).
 *
 * İzin veren hesap KANALIN SAHİBİ olmalı; Marka Hesabına taşınmış bir kanalda
 * Google izin ekranı hangi kanal adına yetki verildiğini ayrıca sorar.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const config = requireYtConfig(event)
  const state = await signState(event, `yt.${Date.now()}`)
  return { url: youtubeAuthorizeUrl(config, state), redirectUri: config.redirectUri }
})

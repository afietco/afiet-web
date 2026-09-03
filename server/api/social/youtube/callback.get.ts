import { exchangeYouTubeCode, fetchChannel, requireYtConfig } from '~~/server/utils/youtube'
import { encryptToken, verifyState } from '~~/server/utils/socialCrypto'
import { requireSocialDb, upsertAccount } from '~~/server/utils/socialStore'

/**
 * YouTube bağlama akışının 2. adımı: Google'ın geri döndüğü adres.
 *
 * Instagram callback'inin birebir kardeşi; iki farkla:
 *   - Saklanan şey REFRESH TOKEN'dır (access token her turda ondan üretilir),
 *   - `expires_at` NULL yazılır: Google'ın refresh token'ının takvimli bir
 *     bitişi yoktur, iptal edilene kadar yaşar.
 *
 * Uç PUBLIC olmak zorunda (Google tarayıcıyı buraya yönlendiriyor); güvenlik
 * `state` HMAC'i + 10 dakikalık ömürle sağlanır. Token ŞİFRELİ saklanır,
 * ekrana ya da log'a asla yazılmaz.
 */
const STATE_TTL_MS = 10 * 60 * 1000

function page(title: string, message: string, ok: boolean): string {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#f5f1e7;
         font-family:ui-rounded,system-ui,sans-serif; color:#292d29; }
  .card { max-width:24rem; padding:32px 28px; border-radius:20px; background:#fffdf8;
          box-shadow:0 18px 55px rgba(48,53,43,.08); text-align:center; }
  h1 { margin:0 0 10px; font-size:19px; }
  p { margin:0; color:#6b6e64; font-size:13px; line-height:1.6; }
  .dot { display:inline-grid; place-items:center; width:44px; height:44px; margin-bottom:14px;
         border-radius:50%; background:${ok ? '#d1fae5' : '#fdecea'}; font-size:20px; }
</style></head><body><div class="card">
<div class="dot">${ok ? '✓' : '!'}</div><h1>${title}</h1><p>${message}</p></div></body></html>`
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'content-type', 'text/html; charset=utf-8')
  const query = getQuery(event)

  if (query.error) {
    return page('Bağlanmadı', 'YouTube izni verilmedi. Panele dönüp yeniden deneyebilirsin.', false)
  }

  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  if (!code || !state) return page('Eksik yanıt', 'Google beklenen bilgileri döndürmedi.', false)

  const payload = await verifyState(event, state).catch(() => null)
  if (!payload) return page('Geçersiz istek', 'Bilet imzası doğrulanamadı. Bağlamayı panelden yeniden başlat.', false)
  const issued = Number(payload.split('.')[1] ?? 0)
  if (!issued || Date.now() - issued > STATE_TTL_MS) {
    return page('Bilet zaman aşımı', 'Bağlama biletinin ömrü doldu. Panelden yeniden başlat.', false)
  }

  try {
    const config = requireYtConfig(event)
    const sql = await requireSocialDb(event)

    const tokens = await exchangeYouTubeCode(config, code)
    const channel = await fetchChannel(tokens.accessToken)

    await upsertAccount(sql, {
      platform: 'youtube',
      handle: channel.handle || channel.title,
      externalId: channel.id,
      encryptedToken: await encryptToken(event, tokens.refreshToken),
      // Refresh token'ın takvimli bitişi yok; panel rozeti "bağlı" kalsın.
      expiresAt: null,
    })

    return page(
      'YouTube bağlandı',
      `${channel.handle || channel.title || channel.id} bağlandı. Bu sekmeyi kapatıp panele dönebilirsin; ölçümler ilk gece senkronunda görünmeye başlar.`,
      true,
    )
  } catch (err) {
    console.error('[sosyal] youtube callback hatası:', err instanceof Error ? err.message : err)
    return page('Bağlanamadı', 'YouTube bağlantısı kurulamadı. Sunucu günlüklerinde ayrıntı var.', false)
  }
})

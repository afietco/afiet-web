import { exchangeCode, exchangeLongLived, fetchMe, requireIgConfig } from '~~/server/utils/instagram'
import { encryptToken, verifyState } from '~~/server/utils/socialCrypto'
import { requireSocialDb, upsertAccount } from '~~/server/utils/socialStore'

/**
 * Bağlama akışının 2. adımı: Meta'nın geri döndüğü adres (redirect_uri).
 *
 * Bu uç PUBLIC olmak zorunda - Instagram tarayıcıyı buraya yönlendiriyor,
 * bizim admin JWT'miz elinde değil. Güvenlik `state` HMAC'iyle sağlanır:
 * imzasız/eski bilet reddedilir, `code` tek kullanımlıktır ve gizli değildir.
 *
 * Yanıt küçük bir HTML sayfasıdır (panel bunu yeni sekmede açtı, kapatmasını
 * söylüyoruz). Token ŞİFRELİ kaydedilir, ekrana ya da log'a asla yazılmaz.
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

  // Kullanıcı izni reddettiyse Meta error_reason ile döner.
  if (query.error) {
    return page('Bağlanmadı', 'Instagram izni verilmedi. Panele dönüp yeniden deneyebilirsin.', false)
  }

  const code = typeof query.code === 'string' ? query.code : ''
  const state = typeof query.state === 'string' ? query.state : ''
  if (!code || !state) return page('Eksik yanıt', 'Instagram beklenen bilgileri döndürmedi.', false)

  const payload = await verifyState(event, state).catch(() => null)
  if (!payload) return page('Geçersiz istek', 'Bilet imzası doğrulanamadı. Bağlamayı panelden yeniden başlat.', false)
  const issued = Number(payload.split('.')[1] ?? 0)
  if (!issued || Date.now() - issued > STATE_TTL_MS) {
    return page('Bilet zaman aşımı', 'Bağlama biletinin ömrü doldu. Panelden yeniden başlat.', false)
  }

  try {
    const config = requireIgConfig(event)
    const sql = await requireSocialDb(event)

    const short = await exchangeCode(config, code)
    const long = await exchangeLongLived(config, short)
    const me = await fetchMe(long.token)

    await upsertAccount(sql, {
      platform: 'instagram',
      handle: me.username,
      externalId: me.userId,
      encryptedToken: await encryptToken(event, long.token),
      expiresAt: long.expiresAt,
    })

    return page(
      'Instagram bağlandı',
      `@${me.username || me.userId} bağlandı. Bu sekmeyi kapatıp panele dönebilirsin; ölçümler ilk gece senkronunda görünmeye başlar.`,
      true,
    )
  } catch (err) {
    // Mesajda token yok (instagram.ts readError'ı URL loglamıyor).
    console.error('[sosyal] instagram callback hatası:', err instanceof Error ? err.message : err)
    return page('Bağlanamadı', 'Instagram bağlantısı kurulamadı. Sunucu günlüklerinde ayrıntı var.', false)
  }
})

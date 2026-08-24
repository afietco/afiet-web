import { requireInternalSecret } from '~~/server/utils/internalAuth'
import { requireContentDb } from '~~/server/utils/contentStore'
import { listAccountsWithTokens } from '~~/server/utils/socialStore'
import { decryptToken } from '~~/server/utils/socialCrypto'
import { publishStory } from '~~/server/utils/instagram'

/**
 * Hazır story'yi Instagram'a paylaşır (Go backend çağırır, X-Internal-Secret
 * ile). Görsel kaynağı /story/<slug>.jpg'dir ve isteğin origin'inden kurulur:
 * Meta adresi kendi tarayıcısıyla çeker, yani herkese açık olmalı; prod'da
 * afiet.co'dur, SSO arkasındaki preview'da Meta zaten erişemez ve çağrı
 * dürüstçe düşer (dev'de bağlı hesap da yok).
 *
 * Yeniden deneme backend'in işi: bu uç idempotent DEĞİLDİR (iki çağrı iki
 * story basar), o yüzden backend ig_media_id boş olmadan bir daha çağırmaz.
 */

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export default defineEventHandler(async (event) => {
  requireInternalSecret(event)
  const body = await readBody<{ slug?: string }>(event)
  const slug = String(body?.slug ?? '').trim()
  if (!SLUG_RE.test(slug)) {
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_slug' })
  }

  const sql = await requireContentDb(event)
  const account = (await listAccountsWithTokens(sql)).find((a) => a.platform === 'instagram')
  if (!account) {
    throw createError({ statusCode: 503, statusMessage: 'instagram_bagli_degil' })
  }

  let token: string
  try {
    token = await decryptToken(event, account.encryptedToken)
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'token_cozulemedi' })
  }

  const origin = getRequestURL(event).origin
  const imageUrl = `${origin}/story/${slug}.jpg`
  try {
    const mediaId = await publishStory(token, account.externalId, imageUrl)
    return { ok: true, mediaId }
  } catch (err) {
    // Mesaj token taşımaz (instagram.ts readError sözleşmesi); backend'in
    // hata mailine girecek kadar kısa tutulur. İzin eksikse çare panelden
    // yeniden bağlanmak: scope değişikliği mevcut token'a işlemez.
    const message = err instanceof Error ? err.message.slice(0, 180) : 'bilinmeyen hata'
    throw createError({ statusCode: 502, statusMessage: 'meta_hata', message })
  }
})

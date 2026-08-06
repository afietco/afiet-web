import type { H3Event } from 'h3'

/**
 * Makine-makine iç uçların kapısı (Go backend → afiet-web). Kimlik tek bir
 * paylaşılan sırdır: `X-Internal-Secret` başlığı = NUXT_INTERNAL_API_SECRET.
 * Admin JWT'si YOK çünkü çağıran bir servis; cron uçlarının `X-Cron-Secret`
 * deseniyle aynı ilke: sır boşsa uçlar 503 döner (yanlışlıkla açık kalmasın).
 *
 * Bu kapının arkasındaki uçlar landing DB'sine YAZAR. Backend'in kendi
 * bağlantısı bilinçli olarak salt okunurdur; içerik hattının tek yazma yolu
 * burasıdır (blog yayını + takvim önerileri).
 */
export function requireInternalSecret(event: H3Event) {
  const expected = String(useRuntimeConfig(event).internalApiSecret ?? '').trim()
  if (!expected) throw createError({ statusCode: 503, statusMessage: 'internal_sir_yok' })
  const given = getHeader(event, 'x-internal-secret') ?? ''
  if (given !== expected) throw createError({ statusCode: 401, statusMessage: 'internal_sir_gecersiz' })
}

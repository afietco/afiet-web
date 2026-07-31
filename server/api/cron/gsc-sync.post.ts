import { requireGscDb } from '~~/server/utils/gscStore'
import { gscServiceAccount, syncGsc } from '~~/server/utils/gsc'

/**
 * Günlük GSC senkronu. Cloud Scheduler çağırır:
 *   app-gsc-sync-prod  30 6 * * *  →  POST /api/cron/gsc-sync
 * Kimlik: `X-Cron-Secret` = NUXT_CRON_SECRET (social-metrics ile aynı desen).
 *
 * GSC verisi ~2 gün geriden gelir; o yüzden sabit 7 günlük kayan pencere her
 * koşuda yeniden çekilip upsert edilir. İlk kurulumda `{"days": 90}` gövdesiyle
 * elle bir kez geriye dönük doldurma yapılır (API 16 aydan eskisini vermez).
 */
export default defineEventHandler(async (event) => {
  const expected = String(useRuntimeConfig(event).cronSecret ?? '').trim()
  if (!expected) throw createError({ statusCode: 503, statusMessage: 'cron_sirri_yok' })
  const given = getHeader(event, 'x-cron-secret') ?? ''
  if (given !== expected) throw createError({ statusCode: 401, statusMessage: 'cron_sirri_gecersiz' })

  if (!gscServiceAccount(event)) throw createError({ statusCode: 503, statusMessage: 'gsc_yapilandirilmadi' })
  const sql = await requireGscDb(event)
  const body = (await readBody(event).catch(() => null)) as { days?: number } | null
  const days = Math.min(480, Math.max(3, Number(body?.days) || 7))

  try {
    const summary = await syncGsc(event, sql, days)
    return { ok: true, ...summary }
  } catch (err) {
    // Token/gövde loglanmaz; yalnız durum + kısa sebep.
    const message = err instanceof Error ? err.message : 'bilinmeyen hata'
    console.error('[gsc] senkron düştü:', message)
    throw createError({ statusCode: 502, statusMessage: 'gsc_senkron_hatasi' })
  }
})

import { requireGscDb } from '~~/server/utils/gscStore'
import { ensureIndexTables } from '~~/server/utils/gscIndexStore'
import { gscServiceAccount } from '~~/server/utils/gsc'
import { sweepIndexStatus } from '~~/server/utils/gscIndex'

/**
 * Sitemap'teki URL'lerin indeks durumu taraması. Cloud Scheduler çağırır:
 *   app-gsc-index-prod  15 * / 4 * * *  →  POST /api/cron/gsc-index
 * Kimlik: `X-Cron-Secret` = NUXT_CRON_SECRET (gsc-sync ile aynı desen).
 *
 * Her tur en bayat N URL'i denetler, gün içinde dört tur listeyi tamamen
 * yeniler. Tek turda tamamını taramak Vercel fonksiyon tavanını aşardı;
 * ayrıntı gscIndex.ts'te.
 *
 * `{"batch": 200, "staleHours": 0}` gövdesiyle elle çağrılırsa tam tur
 * zorlanır (ilk doldurma için). Kota günlük 2000, liste 157, yani tam tur
 * bedavaya yakın.
 */
export default defineEventHandler(async (event) => {
  const expected = String(useRuntimeConfig(event).cronSecret ?? '').trim()
  if (!expected) throw createError({ statusCode: 503, statusMessage: 'cron_sirri_yok' })
  const given = getHeader(event, 'x-cron-secret') ?? ''
  if (given !== expected) throw createError({ statusCode: 401, statusMessage: 'cron_sirri_gecersiz' })

  if (!gscServiceAccount(event)) throw createError({ statusCode: 503, statusMessage: 'gsc_yapilandirilmadi' })
  const sql = await requireGscDb(event)
  await ensureIndexTables(sql)

  const body = (await readBody(event).catch(() => null)) as { batch?: number; staleHours?: number } | null

  try {
    const summary = await sweepIndexStatus(event, sql, {
      batch: Number(body?.batch) || undefined,
      staleHours: body?.staleHours === undefined ? undefined : Number(body.staleHours),
    })
    return { ok: true, ...summary }
  } catch (err) {
    // Token/gövde loglanmaz; yalnız durum + kısa sebep.
    const message = err instanceof Error ? err.message : 'bilinmeyen hata'
    console.error('[gsc-index] tarama düştü:', message)
    throw createError({ statusCode: 502, statusMessage: 'gsc_index_hatasi' })
  }
})

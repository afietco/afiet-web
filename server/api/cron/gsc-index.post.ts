import { requireGscDb } from '~~/server/utils/gscStore'
import { ensureIndexTables } from '~~/server/utils/gscIndexStore'
import { gscServiceAccount } from '~~/server/utils/gsc'
import { sweepIndexStatus } from '~~/server/utils/gscIndex'

/**
 * Sitemap'teki URL'lerin indeks durumu taraması. Cloud Scheduler çağırır:
 *   app-gsc-index-prod  45 * / 3 * * *  →  POST /api/cron/gsc-index
 * Kimlik: `X-Cron-Secret` = NUXT_CRON_SECRET (gsc-sync ile aynı desen).
 *
 * Her tur en bayat N URL'i denetler; günde sekiz tur listeyi tamamen yeniler
 * (8 x 20 = 160, sitemap 157). Tek turda tamamını taramak Vercel fonksiyon
 * tavanını AŞAR ve yarım tur günlük özeti hiç yazamaz; ayrıntı gscIndex.ts'te.
 *
 * `{"staleHours": 0}` gövdesiyle elle çağrılırsa taze satırlar da yeniden
 * denetlenir (ilk doldurmayı hızlandırmak için). `batch` da geçilebilir ama
 * tavan yüzünden 20'nin çok üstüne çıkarılmamalı.
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

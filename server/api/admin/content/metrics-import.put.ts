import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildContentAdminPayload, requireContentDb, upsertMetric } from '~~/server/utils/contentStore'
import { METRICS_IMPORT_MAX } from '~~/server/utils/contentTypes'
import { sanitizeContentMetric } from '~~/server/utils/contentValidate'

/**
 * Toplu ölçüm yazımı - panelin CSV içe aktarımı için (Meta Business Suite >
 * Insights > Export Data). Eşleştirme PANELDE yapılır (permalink → etkinlik);
 * buraya yalnız eşleşmiş satırlar gelir, yani bu uç "aptal" ve idempotenttir:
 * her satır (itemId, metricDate) üzerine yazar.
 *
 * Neden ayrı uç: tek tek PUT metric N istek demek; içe aktarım 100+ satır olur.
 * Body: { metrics: ContentMetricInput[] }
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireContentDb(event)

  const body = (await readBody(event).catch(() => null)) as { metrics?: unknown } | null
  const rows = body?.metrics
  if (!Array.isArray(rows)) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:metrics' })
  if (!rows.length) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:metrics_bos' })
  if (rows.length > METRICS_IMPORT_MAX) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:metrics_cok' })

  // Önce hepsini doğrula: yarısı yazılıp yarısı reddedilen içe aktarım olmasın.
  const clean = rows.map((row) => sanitizeContentMetric(row))
  for (const metric of clean) await upsertMetric(sql, metric)

  return { yazilan: clean.length, payload: await buildContentAdminPayload(event) }
})

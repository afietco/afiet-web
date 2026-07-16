import { requireAdmin } from '~~/server/utils/adminAuth'
import {
  buildContentAdminPayload,
  requireContentDb,
  upsertMetric,
} from '~~/server/utils/contentStore'
import { sanitizeContentMetric } from '~~/server/utils/contentValidate'

/** Ölçüm ekler; aynı (itemId, metricDate) üzerine yazar. Body: ContentMetricInput. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireContentDb(event)

  const body = await readBody(event).catch(() => null)
  const input = sanitizeContentMetric(body)

  await upsertMetric(sql, input)
  return buildContentAdminPayload(event)
})

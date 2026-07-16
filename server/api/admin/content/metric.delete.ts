import { requireAdmin } from '~~/server/utils/adminAuth'
import {
  buildContentAdminPayload,
  deleteMetric,
  requireContentDb,
} from '~~/server/utils/contentStore'
import { sanitizeIdParam } from '~~/server/utils/contentValidate'

/** Tek bir ölçüm kaydını siler. Query: ?id=34 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireContentDb(event)

  const id = sanitizeIdParam(getQuery(event).id)
  await deleteMetric(sql, id)
  return buildContentAdminPayload(event)
})

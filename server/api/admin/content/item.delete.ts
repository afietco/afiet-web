import { requireAdmin } from '~~/server/utils/adminAuth'
import {
  buildContentAdminPayload,
  deleteContentItem,
  invalidateContentCache,
  requireContentDb,
} from '~~/server/utils/contentStore'
import { sanitizeIdParam } from '~~/server/utils/contentValidate'

/** İçeriği siler (metrikleri CASCADE ile gider). Query: ?id=12 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireContentDb(event)

  const id = sanitizeIdParam(getQuery(event).id)
  await deleteContentItem(sql, id)
  invalidateContentCache()
  return buildContentAdminPayload(event)
})

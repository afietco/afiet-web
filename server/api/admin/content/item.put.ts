import { requireAdmin } from '~~/server/utils/adminAuth'
import {
  buildContentAdminPayload,
  invalidateContentCache,
  requireContentDb,
  upsertContentItem,
} from '~~/server/utils/contentStore'
import { sanitizeContentItem } from '~~/server/utils/contentValidate'

/** İçerik ekler/günceller. Body: ContentItemInput (id varsa güncelleme). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireContentDb(event)

  const body = await readBody(event).catch(() => null)
  const input = sanitizeContentItem(body)

  await upsertContentItem(sql, input)
  invalidateContentCache()
  return buildContentAdminPayload(event)
})

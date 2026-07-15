import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildContentAdminPayload } from '~~/server/utils/contentStore'

/** Panel açılış verisi: içerik planı + metrikler + blog yazı özetleri. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return buildContentAdminPayload(event)
})

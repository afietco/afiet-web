import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildSocialAdminPayload } from '~~/server/utils/socialStore'

/** Panel: bağlı hesaplar + eşleşmemiş gönderiler. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return buildSocialAdminPayload(event)
})

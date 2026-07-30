import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildSocialAdminPayload, deleteAccount, requireSocialDb } from '~~/server/utils/socialStore'
import { sanitizeIdParam } from '~~/server/utils/contentValidate'

/**
 * Hesap bağlantısını koparır: satır (ve şifreli token) silinir.
 * Çekilmiş gönderiler ve yazılmış ölçümler KALIR - geçmiş silinmez.
 * Query: ?id=1
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireSocialDb(event)
  await deleteAccount(sql, sanitizeIdParam(getQuery(event).id))
  return buildSocialAdminPayload(event)
})

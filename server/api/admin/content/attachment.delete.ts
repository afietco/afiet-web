import { requireAdmin } from '~~/server/utils/adminAuth'
import {
  buildContentAdminPayload,
  deleteAttachmentRow,
  getAttachment,
  requireContentDb,
} from '~~/server/utils/contentStore'
import { sanitizeIdParam } from '~~/server/utils/contentValidate'
import { deleteObject, requireStorage } from '~~/server/utils/gcsSign'

/**
 * Eki siler: önce kovadaki nesne, sonra satır. Nesne yoksa da satır gider
 * (idempotent). Kovanın soft-delete penceresi 7 gündür, yanlış silme geri
 * alınabilir - ama panelden geri getirme akışı YOK, gcloud ile yapılır.
 * Query: ?id=12
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  requireStorage(event)
  const sql = await requireContentDb(event)

  const id = sanitizeIdParam(getQuery(event).id)
  const attachment = await getAttachment(sql, id)
  if (attachment) {
    await deleteObject(event, attachment.objectKey)
    await deleteAttachmentRow(sql, id)
  }
  return buildContentAdminPayload(event)
})

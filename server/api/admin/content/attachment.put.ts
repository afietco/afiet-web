import { requireAdmin } from '~~/server/utils/adminAuth'
import {
  buildContentAdminPayload,
  deleteAttachmentRow,
  getAttachment,
  markAttachmentReady,
  requireContentDb,
} from '~~/server/utils/contentStore'
import { ATTACHMENT_MAX_BYTES } from '~~/server/utils/contentTypes'
import { sanitizeIdParam } from '~~/server/utils/contentValidate'
import { deleteObject, headObject, requireStorage } from '~~/server/utils/gcsSign'

/**
 * Yükleme sonrası doğrulama: nesne gerçekten kovada mı, boyutu ne.
 * - nesne yok → satır silinir, 422 (yarıda kalan yükleme iz bırakmasın)
 * - boyut sınırı aşılmış → nesne ve satır silinir, 422
 * Body: { id }
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  requireStorage(event)
  const sql = await requireContentDb(event)

  const body = await readBody(event).catch(() => null)
  const id = sanitizeIdParam(String((body as { id?: unknown } | null)?.id ?? ''))

  const attachment = await getAttachment(sql, id)
  if (!attachment) throw createError({ statusCode: 404, statusMessage: 'ek_bulunamadi' })

  const head = await headObject(event, attachment.objectKey)
  if (!head.exists) {
    await deleteAttachmentRow(sql, id)
    throw createError({ statusCode: 422, statusMessage: 'yukleme_tamamlanmadi' })
  }
  if (head.sizeBytes > ATTACHMENT_MAX_BYTES) {
    await deleteObject(event, attachment.objectKey)
    await deleteAttachmentRow(sql, id)
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:sizeBytes' })
  }

  await markAttachmentReady(sql, id, head.sizeBytes)
  return buildContentAdminPayload(event)
})

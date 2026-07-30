import { requireAdmin } from '~~/server/utils/adminAuth'
import { countAttachments, createAttachment, requireContentDb } from '~~/server/utils/contentStore'
import { ALLOWED_MIME, ATTACHMENT_MAX_PER_ITEM, type AttachmentUploadTicket } from '~~/server/utils/contentTypes'
import { sanitizeAttachmentCreate } from '~~/server/utils/contentValidate'
import { envPrefix, requireStorage, signUpload } from '~~/server/utils/gcsSign'

const UPLOAD_TTL_SECONDS = 900

/**
 * Ek yükleme bileti üretir. Dosya sunucudan GEÇMEZ: panel imzalı URL'e
 * doğrudan PUT eder (Vercel'in ~4.5MB gövde sınırı reel videolarını taşımaz).
 * Satır 'bekliyor' olarak açılır; yükleme bitince PUT .../attachment ile
 * doğrulanıp 'hazir' olur.
 */
export default defineEventHandler(async (event): Promise<AttachmentUploadTicket> => {
  await requireAdmin(event)
  requireStorage(event)
  const sql = await requireContentDb(event)

  const body = await readBody(event).catch(() => null)
  const input = sanitizeAttachmentCreate(body)

  const used = await countAttachments(sql, input.itemId)
  if (used >= ATTACHMENT_MAX_PER_ITEM) throw createError({ statusCode: 422, statusMessage: 'ek_siniri_asildi' })

  const kind = ALLOWED_MIME[input.mime]!.kind
  // Anahtar: <ortam>/<icerik>/<rastgele>-<dosya>. Rastgele önek aynı adın
  // üzerine yazmayı ve tahmin edilebilir yol denemelerini engeller.
  const objectKey = `${envPrefix()}/${input.itemId}/${crypto.randomUUID().slice(0, 8)}-${input.fileName}`

  const attachmentId = await createAttachment(sql, { ...input, kind, objectKey })
  const uploadUrl = await signUpload(event, objectKey, input.mime, UPLOAD_TTL_SECONDS)

  return { attachmentId, objectKey, uploadUrl, expiresIn: UPLOAD_TTL_SECONDS, contentType: input.mime }
})

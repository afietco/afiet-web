import { requireAdmin } from '~~/server/utils/adminAuth'
import { getAttachment, requireContentDb } from '~~/server/utils/contentStore'
import { sanitizeIdParam } from '~~/server/utils/contentValidate'
import { requireStorage, signDownload } from '~~/server/utils/gcsSign'

const TTL_SECONDS = 900

/**
 * İndirme/önizleme bileti. Kova gizlidir, kalıcı public URL YOKTUR: her istek
 * 15 dakikalık imzalı URL üretir.
 * Query: ?id=12&mod=indir|onizleme  (indir → tarayıcı kaydeder)
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  requireStorage(event)
  const sql = await requireContentDb(event)

  const query = getQuery(event)
  const id = sanitizeIdParam(query.id)
  const attachment = await getAttachment(sql, id)
  if (!attachment) throw createError({ statusCode: 404, statusMessage: 'ek_bulunamadi' })

  const download = query.mod !== 'onizleme'
  const url = await signDownload(event, attachment.objectKey, download ? attachment.fileName : undefined, TTL_SECONDS)
  return { url, expiresIn: TTL_SECONDS, fileName: attachment.fileName, mime: attachment.mime }
})

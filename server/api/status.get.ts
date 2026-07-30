import {
  emptyStatus,
  ensureStatusTables,
  readStatus,
  statusSql,
  type StatusPayload,
} from '~~/server/utils/statusStore'

/**
 * /durum sayfasının okuduğu toplam görünüm. Herkese açık; kimlik istemez.
 * DB yoksa (yerel boş kurulum) her şey 'none' döner ve sayfa "veri
 * toplanıyor" gösterir. Yanıt route kuralıyla 60 sn önbelleklenir.
 */
export default defineEventHandler(async (event): Promise<StatusPayload> => {
  const sql = statusSql(event)
  if (!sql) return emptyStatus()
  await ensureStatusTables(sql)
  return readStatus(sql)
})

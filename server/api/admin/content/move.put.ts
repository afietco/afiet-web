import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildContentAdminPayload, moveContentItem, requireContentDb } from '~~/server/utils/contentStore'
import { sanitizeMove } from '~~/server/utils/contentValidate'

/**
 * Takvimde sürükle-bırak: yalnız zamanı taşır. Ayrı uç olmasının sebebi tam
 * item PUT'unun bütün alanları göndermesi gerekmesi; sürüklerken elimizde
 * yalnız yeni an var ve başka alanın kazara ezilmesini istemiyoruz.
 * Body: { id, plannedAt, allDay }
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireContentDb(event)

  const body = await readBody(event).catch(() => null)
  const { id, plannedAt, allDay } = sanitizeMove(body)

  await moveContentItem(sql, id, plannedAt, allDay)
  return buildContentAdminPayload(event)
})

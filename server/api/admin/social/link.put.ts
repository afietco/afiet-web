import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildSocialAdminPayload, linkPost, requireSocialDb } from '~~/server/utils/socialStore'

/**
 * Eşleşmemiş bir gönderiyi takvim etkinliğine bağlar (ya da itemId null ile
 * bağı koparır). Otomatik eşleştirme yalnız platform kimliği/permalink ile
 * çalışır; caption benzerliğine bakılmaz, yanlış eşleşme eşleşmemekten kötüdür.
 * Body: { postId, itemId | null }
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireSocialDb(event)

  const body = (await readBody(event).catch(() => null)) as { postId?: unknown; itemId?: unknown } | null
  const postId = Number(body?.postId)
  if (!Number.isInteger(postId) || postId <= 0) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:postId' })

  let itemId: number | null = null
  if (body?.itemId !== null && body?.itemId !== undefined) {
    const parsed = Number(body.itemId)
    if (!Number.isInteger(parsed) || parsed <= 0) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:itemId' })
    const exists = await sql`SELECT 1 FROM content_items WHERE id = ${parsed}`
    if (!exists.length) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:itemId' })
    itemId = parsed
  }

  await linkPost(sql, postId, itemId)
  return buildSocialAdminPayload(event)
})

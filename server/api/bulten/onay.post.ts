import { bultenSql, confirmByToken } from '~~/server/utils/bultenStore'

/**
 * Çift onayın ikinci yarısı. Uç 200 + status döner, 404'ü sayfa kurmaz:
 * /bulten/onay SSR'da bu ucu çağırır ve durumdan kendi cümlesini üretir
 * (yenilikler [version] ucundaki payload ilkesinin aynısı).
 */
export default defineEventHandler(async (event): Promise<{ status: string }> => {
  const body = await readBody(event).catch(() => ({}) as Record<string, unknown>)
  const token = String(body?.token ?? '').trim()
  if (!token || token.length > 80) return { status: 'gecersiz' }

  const sql = bultenSql(event)
  if (!sql) return { status: 'soon' }

  const ok = await confirmByToken(sql, token)
  return { status: ok ? 'confirmed' : 'gecersiz' }
})

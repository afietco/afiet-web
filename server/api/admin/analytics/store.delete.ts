import { requireAdmin } from '~~/server/utils/adminAuth'
import { aggregateStore, deleteStoreEntry, requireStoreDb } from '~~/server/utils/storeMetricsStore'
import { parseRange } from '~~/server/utils/analyticsReport'

/** Mağaza ölçümü siler: `?id=<satır>&range=`. Taze aggregate döner. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireStoreDb(event)
  const query = getQuery(event)
  const id = Number(query.id)
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:id' })
  await deleteStoreEntry(sql, id)
  return aggregateStore(sql, parseRange(query.range))
})

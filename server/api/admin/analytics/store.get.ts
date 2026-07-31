import { requireAdmin } from '~~/server/utils/adminAuth'
import { aggregateStore, requireStoreDb } from '~~/server/utils/storeMetricsStore'
import { parseRange } from '~~/server/utils/analyticsReport'

/** Panel (Analitik → Mağaza): elle/CSV girilen mağaza ölçümleri. `?range=`. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireStoreDb(event)
  return aggregateStore(sql, parseRange(getQuery(event).range))
})

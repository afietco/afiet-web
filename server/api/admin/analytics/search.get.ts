import { requireAdmin } from '~~/server/utils/adminAuth'
import { aggregateGsc, requireGscDb } from '~~/server/utils/gscStore'
import { gscServiceAccount } from '~~/server/utils/gsc'
import { parseRange } from '~~/server/utils/analyticsReport'

/**
 * Panel (Analitik → SEO & GEO → Arama performansı): GSC verisinin yerel
 * kopyasından aggregate. `connected:false` = servis hesabı yapılandırılmamış;
 * panel kurulum yönergesini gösterir, tablolar boş döner.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireGscDb(event)
  const connected = Boolean(gscServiceAccount(event))
  return aggregateGsc(sql, parseRange(getQuery(event).range), connected)
})

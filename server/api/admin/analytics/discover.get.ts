import { requireAdmin } from '~~/server/utils/adminAuth'
import { requireGscDb } from '~~/server/utils/gscStore'
import { aggregateDiscover, ensureDiscoverTables } from '~~/server/utils/gscDiscoverStore'
import { gscServiceAccount } from '~~/server/utils/gsc'
import { parseRange } from '~~/server/utils/analyticsReport'

/**
 * Panel (Analitik → SEO & GEO → Discover): Discover verisinin yerel
 * kopyasından aggregate. Arama performansıyla AYNI desendir, ayrı uçtur;
 * `search.get.ts` yanıtına eklenmedi çünkü metrik kümesi farklı (pozisyon yok)
 * ve iki yüzeyin "veri yok" durumu ayrı cümle kurar.
 *
 * `connected:false` = servis hesabı yapılandırılmamış.
 * `measured:false`  = servis hesabı var, senkron koştu ama Google Discover
 *                     raporu HİÇ döndürmedi (mülk eşiğin altında). Bu SIFIR
 *                     DEĞİLDİR ve panelde sıfır diye gösterilmez.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireGscDb(event)
  await ensureDiscoverTables(sql)
  const connected = Boolean(gscServiceAccount(event))
  return aggregateDiscover(sql, parseRange(getQuery(event).range), connected)
})

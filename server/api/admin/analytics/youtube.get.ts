import { requireAdmin } from '~~/server/utils/adminAuth'
import { parseRange } from '~~/server/utils/analyticsReport'
import { buildYouTubeData, requireYouTubeDb } from '~~/server/utils/youtubeStore'

/**
 * Panel (Analitik → YouTube) verisi. Yalnız yerel kopyadan okur; her istekte
 * Google'a gidilmez (gsc/search ucuyla aynı ilke). `?range=7d|30d|90d`.
 *
 * Kanal bağlı değilken de 200 döner: `connected:false` ve boş seriyle panel
 * kurulum yönergesini gösterir, hata ekranı değil.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireYouTubeDb(event)
  return buildYouTubeData(sql, parseRange(getQuery(event).range))
})

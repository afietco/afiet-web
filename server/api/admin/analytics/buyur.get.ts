import { requireAdmin } from '~~/server/utils/adminAuth'
import { analyticsSql } from '~~/server/utils/analyticsStore'
import { parseBuyurRange, toplaBuyur } from '~~/server/utils/buyurReport'

/**
 * Panel (afiet-admin → Analitik → buyur) verisi: `buyur_events`ten TOPLU
 * metrikler. `?range=7d|30d|90d`. DB yoksa 503 `db_bagli_degil`.
 *
 * `ensureAnalyticsTables` BİLEREK çağrılmaz: bu uç `analytics_events`e hiç
 * dokunmuyor ve `buyur_events`in sahibi de afiet-buyur reposu. Okuyan taraf
 * şema kurmaz, yoksa iki repo aynı tabloyu iki ayrı tanımla kurmaya çalışır.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const sql = analyticsSql(event)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })

  return toplaBuyur(sql, parseBuyurRange(getQuery(event).range))
})

import { requireAdmin } from '~~/server/utils/adminAuth'
import { analyticsSql, ensureAnalyticsTables } from '~~/server/utils/analyticsStore'
import { aggregateAnalytics, parseRange } from '~~/server/utils/analyticsReport'

/**
 * Panel (afiet-admin → Analitik) verisi: `analytics_events`ten TOPLU metrikler.
 * `?range=7d|30d|90d`. Yalnız production host'ları (public.analyticsDomains)
 * sayılır. DB yoksa 503 `db_bagli_degil` → panel placeholder gösterir.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const sql = analyticsSql(event)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })
  await ensureAnalyticsTables(sql)

  const domains = String(useRuntimeConfig(event).public.analyticsDomains || 'afiet.co,www.afiet.co')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
  const range = parseRange(getQuery(event).range)

  return aggregateAnalytics(sql, domains, range)
})

import { requireAdmin } from '~~/server/utils/adminAuth'
import { aggregateStore, requireStoreDb, upsertStoreEntry, type StoreEntryInput } from '~~/server/utils/storeMetricsStore'
import { parseRange } from '~~/server/utils/analyticsReport'

/**
 * Tek mağaza ölçümü yazar (aynı tarih+platform üzerine yazar) ve taze
 * aggregate döner (panelin tek gerçeği yanıt payload'ıdır; content deseni).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireStoreDb(event)
  const body = (await readBody(event).catch(() => null)) as Partial<StoreEntryInput> & { range?: string } | null

  if (!body || typeof body.metricDate !== 'string' || !DATE_RE.test(body.metricDate))
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:metricDate' })
  if (body.platform !== 'ios' && body.platform !== 'android')
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:platform' })
  const downloads = Number(body.downloads)
  if (!Number.isFinite(downloads) || downloads < 0 || !Number.isInteger(downloads))
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:downloads' })
  let pageViews: number | null = null
  if (body.pageViews !== null && body.pageViews !== undefined) {
    pageViews = Number(body.pageViews)
    if (!Number.isFinite(pageViews) || pageViews < 0 || !Number.isInteger(pageViews))
      throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:pageViews' })
  }

  await upsertStoreEntry(sql, {
    metricDate: body.metricDate,
    platform: body.platform,
    downloads,
    pageViews,
    // Gösterim yalnız API'den gelir; panelde alanı yok.
    impressions: null,
    note: typeof body.note === 'string' ? body.note.trim().slice(0, 300) : '',
    source: body.source === 'csv' ? 'csv' : 'elle',
  })

  return aggregateStore(sql, parseRange(body.range))
})

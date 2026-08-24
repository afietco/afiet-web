import { requireAdmin } from '~~/server/utils/adminAuth'
import { aggregateStore, requireStoreDb, upsertStoreEntry, type StoreEntryInput } from '~~/server/utils/storeMetricsStore'
import { parseRange } from '~~/server/utils/analyticsReport'

/**
 * CSV içe aktarımı: panel dosyayı kendisi ayrıştırır, doğrulanmış satırları
 * tek istekte gönderir (content metrics-import deseni). Satır sınırı 500;
 * hatalı satır TÜM isteği düşürür (yarım içe aktarım kafa karıştırır).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireStoreDb(event)
  const body = (await readBody(event).catch(() => null)) as { entries?: Partial<StoreEntryInput>[]; range?: string } | null
  const entries = body?.entries
  if (!Array.isArray(entries) || entries.length === 0)
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:entries' })
  if (entries.length > 500) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:entries_500' })

  const clean: StoreEntryInput[] = entries.map((e, i) => {
    if (typeof e.metricDate !== 'string' || !DATE_RE.test(e.metricDate))
      throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:satir_${i + 1}_tarih` })
    if (e.platform !== 'ios' && e.platform !== 'android')
      throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:satir_${i + 1}_platform` })
    const downloads = Number(e.downloads)
    if (!Number.isFinite(downloads) || downloads < 0 || !Number.isInteger(downloads))
      throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:satir_${i + 1}_indirme` })
    let pageViews: number | null = null
    if (e.pageViews !== null && e.pageViews !== undefined) {
      pageViews = Number(e.pageViews)
      if (!Number.isFinite(pageViews) || pageViews < 0 || !Number.isInteger(pageViews))
        throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:satir_${i + 1}_goruntuleme` })
    }
    return {
      metricDate: e.metricDate,
      platform: e.platform,
      downloads,
      pageViews,
      impressions: null,
      note: typeof e.note === 'string' ? e.note.trim().slice(0, 300) : '',
      source: 'csv',
    }
  })

  for (const entry of clean) await upsertStoreEntry(sql, entry)

  return { yazilan: clean.length, payload: await aggregateStore(sql, parseRange(body?.range)) }
})

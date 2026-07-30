import { describe, syncAccount } from '~~/server/utils/instagram'
import { ensureContentTables } from '~~/server/utils/contentStore'
import { listAccountsWithTokens, requireSocialDb } from '~~/server/utils/socialStore'
import type { SyncSummary } from '~~/server/utils/socialTypes'

/**
 * Günlük ölçüm senkronu. Cloud Scheduler çağırır (ortam başına bir iş):
 *   app-social-metrics-<ortam>  0 6 * * *  →  POST /api/cron/social-metrics
 * Kimlik: `X-Cron-Secret` başlığı = NUXT_CRON_SECRET. Admin JWT'si YOK, çünkü
 * çağıran bir makine.
 *
 * Neden cron: hiçbir platform metrik webhook'u vermiyor; Meta ayrıca 90 günden
 * eskisini döndürmüyor - anlık görüntüyü biz almazsak geçmiş kayboluyor.
 *
 * Bir hesabın hatası diğerini düşürmez; her tur hesabın `last_result`ına
 * özetini yazar (panelde rozet olarak görünür).
 */
export default defineEventHandler(async (event) => {
  const expected = String(useRuntimeConfig(event).cronSecret ?? '').trim()
  if (!expected) throw createError({ statusCode: 503, statusMessage: 'cron_sirri_yok' })
  const given = getHeader(event, 'x-cron-secret') ?? ''
  if (given !== expected) throw createError({ statusCode: 401, statusMessage: 'cron_sirri_gecersiz' })

  const sql = await requireSocialDb(event)
  await ensureContentTables(sql) // ölçümler content_metrics'e yazılıyor

  const accounts = await listAccountsWithTokens(sql)
  const summaries: SyncSummary[] = []
  for (const account of accounts) {
    if (account.platform !== 'instagram') continue // Faz 2 kapsamı
    try {
      summaries.push(await syncAccount(event, sql, account))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'bilinmeyen hata'
      console.error('[sosyal] senkron düştü:', account.platform, message)
      summaries.push({
        platform: account.platform,
        handle: account.handle,
        fetched: 0,
        matched: 0,
        measured: 0,
        refreshed: false,
        errors: [message],
      })
    }
  }

  return {
    ok: true,
    accounts: accounts.length,
    synced: summaries.length,
    summaries: summaries.map((s) => ({ ...s, ozet: describe(s) })),
  }
})

import { describe as describeIg, syncAccount } from '~~/server/utils/instagram'
import { describeYouTube, syncYouTube } from '~~/server/utils/youtube'
import { ensureContentTables } from '~~/server/utils/contentStore'
import { ensureYouTubeTables } from '~~/server/utils/youtubeStore'
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
 * İKİ PLATFORM, İKİ AYRI SENKRON: Instagram ömür toplamının anlık görüntüsünü
 * alır (instagram.ts), YouTube gün gün seriyi ve pencere anlık görüntülerini
 * yazar (youtube.ts). Aynı işte koşuyorlar çünkü aynı ritim ve aynı sır yüzeyi
 * yeter; ikinci bir Scheduler işi ikinci bir izin yüzeyi demekti.
 *
 * `{"days": 30}` gövdesi YALNIZ YouTube'un kayan penceresini genişletir (ilk
 * kurulumda geriye dönük doldurma için). Instagram'da karşılığı yok: Meta
 * geçmiş insight'ı vermiyor.
 *
 * Bir hesabın hatası diğerini düşürmez; her tur hesabın `last_result`ına
 * özetini yazar (panelde rozet olarak görünür).
 */
export default defineEventHandler(async (event) => {
  const expected = String(useRuntimeConfig(event).cronSecret ?? '').trim()
  if (!expected) throw createError({ statusCode: 503, statusMessage: 'cron_sirri_yok' })
  const given = getHeader(event, 'x-cron-secret') ?? ''
  if (given !== expected) throw createError({ statusCode: 401, statusMessage: 'cron_sirri_gecersiz' })

  const body = (await readBody(event).catch(() => null)) as { days?: number } | null
  const days = Math.min(90, Math.max(1, Number(body?.days) || 7))

  const sql = await requireSocialDb(event)
  await ensureContentTables(sql) // ölçümler content_metrics'e yazılıyor
  await ensureYouTubeTables(sql)

  const accounts = await listAccountsWithTokens(sql)
  const summaries: { summary: SyncSummary; ozet: string }[] = []
  for (const account of accounts) {
    try {
      if (account.platform === 'instagram') {
        const summary = await syncAccount(event, sql, account)
        summaries.push({ summary, ozet: describeIg(summary) })
      } else if (account.platform === 'youtube') {
        const summary = await syncYouTube(event, sql, account, undefined, days)
        summaries.push({ summary, ozet: describeYouTube(summary) })
      }
      // Diğer platformlar (x, tiktok) henüz kapsam dışı: hesap satırı olsa
      // bile sessizce atlanır, hata üretmez.
    } catch (err) {
      const message = err instanceof Error ? err.message : 'bilinmeyen hata'
      console.error('[sosyal] senkron düştü:', account.platform, message)
      const summary: SyncSummary = {
        platform: account.platform,
        handle: account.handle,
        fetched: 0,
        matched: 0,
        measured: 0,
        refreshed: false,
        errors: [message],
      }
      summaries.push({ summary, ozet: `hata: ${message}` })
    }
  }

  return {
    ok: true,
    accounts: accounts.length,
    synced: summaries.length,
    days,
    summaries: summaries.map((s) => ({ ...s.summary, ozet: s.ozet })),
  }
})

import { runAllProbes } from '~~/server/utils/statusProbes'
import {
  ensureStatusTables,
  insertChecks,
  pruneOldChecks,
  reconcileIncidents,
  statusSql,
} from '~~/server/utils/statusStore'

/**
 * 5 dakikalık durum kontrolü. Cloud Scheduler çağırır:
 *   app-status-check, her 5 dakikada  →  POST /api/cron/status-check
 * Kimlik: `X-Cron-Secret` başlığı = NUXT_CRON_SECRET. Admin JWT'si YOK,
 * çünkü çağıran bir makine.
 *
 * Yalnız production'da anlamlıdır (Scheduler afiet.co'yu çağırır);
 * dev/staging'de tablo boş kalır ve /durum "veri toplanıyor" gösterir.
 */
export default defineEventHandler(async (event) => {
  const expected = String(useRuntimeConfig(event).cronSecret ?? '').trim()
  if (!expected) throw createError({ statusCode: 503, statusMessage: 'cron_sirri_yok' })
  const given = getHeader(event, 'x-cron-secret') ?? ''
  if (given !== expected) throw createError({ statusCode: 401, statusMessage: 'cron_sirri_gecersiz' })

  const sql = statusSql(event)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'veritabani_yok' })
  await ensureStatusTables(sql)

  const results = await runAllProbes()
  await insertChecks(sql, results)
  await reconcileIncidents(sql, results)
  await pruneOldChecks(sql)

  return {
    ok: true,
    checked: results.length,
    down: results.filter((r) => r.state === 'down').map((r) => r.component),
  }
})

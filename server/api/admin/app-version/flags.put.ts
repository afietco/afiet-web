import { requireAdmin } from '~~/server/utils/adminAuth'
import { readAppVersionGate, sanitizeAppFlags, writeAppFlags } from '~~/server/utils/appVersionStore'

/**
 * Uygulama anahtarlarını kaydeder (bugün tek anahtar: FTUE panosu).
 *
 * `/api/app-version` bunları da döner; uygulama sürüm kapısıyla birlikte
 * okur. Bir release beklemeden geri alınabilsin diye buradan çevrilir.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readBody(event).catch(() => null)
  const value = sanitizeAppFlags(body?.value)
  await writeAppFlags(event, value)
  return { gate: await readAppVersionGate(event) }
})

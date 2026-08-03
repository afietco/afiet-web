import { requireAdmin } from '~~/server/utils/adminAuth'
import { readAppVersionGate } from '~~/server/utils/appVersionStore'

/** Panelin okuduğu hali; public uçla aynı gövde, yalnız kimlik arkasında. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { gate: await readAppVersionGate(event) }
})

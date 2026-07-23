import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildBetaAdminPayload } from '~~/server/utils/betaStore'

/** Panel (afiet-admin → Beta başvuruları) verisi: başvuru listesi + kırılımlar. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return buildBetaAdminPayload(event)
})

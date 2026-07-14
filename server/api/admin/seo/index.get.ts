import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildAdminPayload } from '~~/server/utils/adminPayload'

/** Panel açılış verisi: override + varsayılan + efektif SEO durumu. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return buildAdminPayload(event)
})

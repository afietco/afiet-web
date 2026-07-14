import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildAdminPayload } from '~~/server/utils/adminPayload'
import { invalidateSeoCache, normalizePath } from '~~/server/utils/seoStore'

/** Yönlendirme siler. Query: ?from=/eski-yol */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const url = useRuntimeConfig(event).databaseUrl
  if (!url) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })

  const raw = getQuery(event).from
  if (typeof raw !== 'string' || !raw.startsWith('/')) {
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:from' })
  }
  const sql = neon(url)
  await sql`DELETE FROM seo_redirects WHERE from_path = ${normalizePath(raw)}`
  await invalidateSeoCache()
  return buildAdminPayload(event)
})

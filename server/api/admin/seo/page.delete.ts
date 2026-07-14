import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildAdminPayload } from '~~/server/utils/adminPayload'
import { invalidateSeoCache, normalizePath } from '~~/server/utils/seoStore'

/** Bir sayfanın override'ını siler (varsayılana dön). Query: ?path=/gizlilik */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const url = useRuntimeConfig(event).databaseUrl
  if (!url) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })

  const raw = getQuery(event).path
  if (typeof raw !== 'string' || !raw.startsWith('/')) {
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:path' })
  }
  const sql = neon(url)
  await sql`DELETE FROM seo_pages WHERE path = ${normalizePath(raw)}`
  await invalidateSeoCache()
  return buildAdminPayload(event)
})

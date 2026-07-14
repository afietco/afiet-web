import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildAdminPayload } from '~~/server/utils/adminPayload'
import { invalidateSeoCache, normalizePath } from '~~/server/utils/seoStore'
import { sanitizePageValue } from '~~/server/utils/seoValidate'

/** Bir sayfanın SEO override'ını kaydeder. Body: { path, value }. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const url = useRuntimeConfig(event).databaseUrl
  if (!url) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })

  const body = await readBody(event).catch(() => null)
  if (typeof body?.path !== 'string' || !body.path.startsWith('/')) {
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:path' })
  }
  const path = normalizePath(body.path)
  const value = sanitizePageValue(body.value)

  const sql = neon(url)
  await sql`
    INSERT INTO seo_pages (path, value, updated_at)
    VALUES (${path}, ${JSON.stringify(value)}::jsonb, now())
    ON CONFLICT (path) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `
  await invalidateSeoCache()
  return buildAdminPayload(event)
})

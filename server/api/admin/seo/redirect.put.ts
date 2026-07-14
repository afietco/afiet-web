import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildAdminPayload } from '~~/server/utils/adminPayload'
import { invalidateSeoCache } from '~~/server/utils/seoStore'
import { sanitizeRedirect } from '~~/server/utils/seoValidate'

/** Yönlendirme ekler/günceller. Body: { from, to, code }. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const url = useRuntimeConfig(event).databaseUrl
  if (!url) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })

  const body = await readBody(event).catch(() => null)
  const r = sanitizeRedirect(body)

  const sql = neon(url)
  // Zincir oluşmasın: hedefi bu kaynağa işaret eden kayıt varsa reddet.
  const loop = await sql`
    SELECT 1 FROM seo_redirects WHERE from_path = ${r.to.startsWith('/') ? r.to : ''} AND to_path = ${r.from} LIMIT 1
  `
  if (loop.length) throw createError({ statusCode: 422, statusMessage: 'yonlendirme_dongusu' })

  await sql`
    INSERT INTO seo_redirects (from_path, to_path, code, updated_at)
    VALUES (${r.from}, ${r.to}, ${r.code}, now())
    ON CONFLICT (from_path) DO UPDATE
      SET to_path = EXCLUDED.to_path, code = EXCLUDED.code, updated_at = now()
  `
  await invalidateSeoCache()
  return buildAdminPayload(event)
})

import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildAdminPayload } from '~~/server/utils/adminPayload'
import { SETTINGS_KEYS, invalidateSeoCache } from '~~/server/utils/seoStore'
import { sanitizeSettingsValue } from '~~/server/utils/seoValidate'
import type { SettingsKey } from '~~/server/utils/seoTypes'

/** Bir ayar bölümünü (general/robots/llms/schema/faq) kaydeder (upsert). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const key = getRouterParam(event, 'key') as SettingsKey
  if (!SETTINGS_KEYS.includes(key)) {
    throw createError({ statusCode: 404, statusMessage: 'bilinmeyen_ayar' })
  }
  const url = useRuntimeConfig(event).databaseUrl
  if (!url) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })

  const body = await readBody(event).catch(() => null)
  const value = sanitizeSettingsValue(key, body?.value)

  const sql = neon(url)
  await sql`
    INSERT INTO seo_settings (key, value, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `
  await invalidateSeoCache()
  return buildAdminPayload(event)
})

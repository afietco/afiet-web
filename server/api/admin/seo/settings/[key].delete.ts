import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '~~/server/utils/adminAuth'
import { buildAdminPayload } from '~~/server/utils/adminPayload'
import { SETTINGS_KEYS, invalidateSeoCache } from '~~/server/utils/seoStore'
import type { SettingsKey } from '~~/server/utils/seoTypes'

/** Bir ayar bölümünü koddaki varsayılanına döndürür (override satırını siler). */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const key = getRouterParam(event, 'key') as SettingsKey
  if (!SETTINGS_KEYS.includes(key)) {
    throw createError({ statusCode: 404, statusMessage: 'bilinmeyen_ayar' })
  }
  const url = useRuntimeConfig(event).databaseUrl
  if (!url) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })

  const sql = neon(url)
  await sql`DELETE FROM seo_settings WHERE key = ${key}`
  await invalidateSeoCache()
  return buildAdminPayload(event)
})

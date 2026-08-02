import { requireAdmin } from '~~/server/utils/adminAuth'
import {
  readAppVersionGate,
  sanitizePlatformGate,
  writePlatformGate,
} from '~~/server/utils/appVersionStore'
import { APP_VERSION_PLATFORMS, type AppVersionPlatform } from '#shared/types/appVersion'

/**
 * Tek platformun eşiklerini kaydeder.
 *
 * Platform başına ayrı, çünkü iki mağaza asla aynı anda yayına almıyor:
 * Apple inceliyor, Play kademeli açıyor. Tek bir "en yeni" alanı, filonun
 * yarısına henüz orada olmayan bir sürümü göstermek olurdu.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const platform = getRouterParam(event, 'platform') as AppVersionPlatform
  if (!APP_VERSION_PLATFORMS.includes(platform)) {
    throw createError({ statusCode: 404, statusMessage: 'bilinmeyen_platform' })
  }

  const body = await readBody(event).catch(() => null)
  const value = sanitizePlatformGate(body?.value)
  await writePlatformGate(event, platform, value)

  return { gate: await readAppVersionGate(event) }
})

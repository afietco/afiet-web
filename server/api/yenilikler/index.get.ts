import { releaseSummaries } from '~~/server/utils/releaseStore'

/**
 * Sürüm listesi: en yeni sürüm başta, gövdesiz. `/yenilikler` sayfası ile
 * sürüm sayfasındaki "diğer sürümler" şeridi bunu okur.
 */
export default defineEventHandler(async (event) => {
  const releases = await releaseSummaries()
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return { releases, total: releases.length }
})

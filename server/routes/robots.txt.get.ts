import { buildRobotsTxt, getSeoBundle } from '~~/server/utils/seoStore'

/**
 * Dinamik robots.txt — AI bot izinleri ve ek kurallar panelden yönetilir.
 * (Statik public/robots.txt kaldırıldı; bu route onun yerini alır.)
 */
export default defineEventHandler(async (event) => {
  const bundle = await getSeoBundle(event)
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return buildRobotsTxt(bundle.settings)
})

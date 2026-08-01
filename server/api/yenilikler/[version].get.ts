import { getRelease } from '~~/server/utils/releaseStore'

/**
 * Tek sürüm: meta alanları + sunucuda render edilmiş HTML gövde.
 *
 * Bilinmeyen sürüm burada HATA DEĞİL, bir durumdur: `release: null` döner ve
 * 404'ü SAYFA kurar. Uç 404 verdiğinde istemci hidrasyonda payload'ı
 * kullanamıyor ve konsola uyumsuzluk düşüyordu.
 */
export default defineEventHandler(async (event) => {
  const version = getRouterParam(event, 'version') ?? ''
  const release = version ? await getRelease(version) : null

  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return { release }
})

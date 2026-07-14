import { getRedirects, normalizePath } from '~~/server/utils/seoStore'

/**
 * Panelden tanımlanan 301/302 yönlendirmeleri (tam yol eşleşmesi).
 * API, Nuxt iç yolları ve dosya uzantılı istekler es geçilir; sorgu
 * parametreleri hedefe taşınır.
 */
export default defineEventHandler(async (event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  const url = event.path || '/'
  const [pathOnly, query = ''] = url.split('?') as [string, string?]
  if (
    pathOnly.startsWith('/api/') ||
    pathOnly.startsWith('/_nuxt/') ||
    pathOnly.startsWith('/__') ||
    /\.[a-z0-9]+$/i.test(pathOnly)
  ) {
    return
  }

  const redirects = await getRedirects(event)
  if (!redirects.length) return
  const from = normalizePath(pathOnly)
  const hit = redirects.find((r) => r.from === from)
  if (!hit) return

  const target = hit.to + (query && !hit.to.includes('?') ? `?${query}` : '')
  return sendRedirect(event, target, hit.code)
})

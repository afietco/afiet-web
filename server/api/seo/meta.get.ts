import { resolvePageMeta } from '~~/server/utils/seoStore'

/**
 * Bir sayfanın efektif meta seti — sayfalar SSR sırasında bunu çağırır
 * (usePageSeo), panel de canlı önizleme için kullanır. Public ve yan etkisiz.
 */
export default defineEventHandler(async (event) => {
  const raw = getQuery(event).path
  const path = typeof raw === 'string' && raw.startsWith('/') ? raw : '/'
  // Public veri; panel farklı origin'den canlı önizleme çekebilsin.
  setHeader(event, 'Access-Control-Allow-Origin', '*')
  return resolvePageMeta(event, path)
})

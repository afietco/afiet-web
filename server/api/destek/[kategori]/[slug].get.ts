import { getSupportArticle } from '~~/server/utils/supportStore'
import { supportCategory } from '~~/server/utils/supportCategories'

/**
 * Tek destek yazısı: render edilmiş gövde, içindekiler, komşular ve ilgili
 * yazılar. Bilinmeyen kategori/slug GERÇEK 404 döner; sayfa da 404'e düşer
 * (sitede soft-404 yok, app/error.vue devreye girer).
 */
export default defineEventHandler(async (event) => {
  const categorySlug = getRouterParam(event, 'kategori') ?? ''
  const slug = getRouterParam(event, 'slug') ?? ''

  const category = supportCategory(categorySlug)
  if (!category) throw createError({ statusCode: 404, statusMessage: 'kategori_yok' })

  const article = await getSupportArticle(categorySlug, slug)
  if (!article) throw createError({ statusCode: 404, statusMessage: 'yazi_yok' })

  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return { category, article }
})

import { supportCategoriesWithArticles } from '~~/server/utils/supportStore'

/**
 * Destek merkezi haritası: kategoriler ve içindeki yazı özetleri (gövdesiz).
 * Hub ve kategori sayfaları ile yazı sayfasının sol menüsü bunu okur.
 */
export default defineEventHandler(async (event) => {
  const categories = await supportCategoriesWithArticles()
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return {
    categories,
    total: categories.reduce((n, c) => n + c.articles.length, 0),
  }
})

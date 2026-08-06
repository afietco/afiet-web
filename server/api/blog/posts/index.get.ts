import { getPublishedPosts } from '~~/server/utils/contentStore'

/**
 * Yayındaki yazıların listesi (gövdesiz) - /blog ve /en/blog sayfaları okur.
 *
 * `?lang=` verilmezse TÜRKÇE döner: uç zaten Türkçe listeyi servis ediyordu ve
 * varsayılanı değiştirmek İngilizce yazı eklendiği gün Türkçe sayfaya yabancı
 * dil düşürürdü.
 */
export default defineEventHandler(async (event) => {
  const raw = String(getQuery(event).lang ?? 'tr')
  const lang = raw === 'en' ? 'en' : 'tr'
  const posts = await getPublishedPosts(event, lang)
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60')
  return {
    posts: posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      tags: p.tags,
      coverUrl: p.coverUrl,
      publishedAt: p.publishedAt,
      readingMinutes: p.readingMinutes,
    })),
  }
})

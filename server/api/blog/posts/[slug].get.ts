import { getPublishedPost } from '~~/server/utils/contentStore'
import { renderMarkdown } from '~~/server/utils/markdown'

/**
 * Tek yazı: meta alanları + sunucuda render edilmiş HTML gövde.
 *
 * `?lang=` sayfanın hangi dilde açıldığını söyler ve yazı o dilde DEĞİLSE 404
 * döner: aynı içeriğin hem /blog/<slug> hem /en/blog/<slug> altında yaşaması
 * duplicate ve yanlış dil çerçevesi demek olurdu.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const rawLang = getQuery(event).lang
  const lang = rawLang === undefined ? undefined : rawLang === 'en' ? 'en' : 'tr'
  const post = slug ? await getPublishedPost(event, slug, lang) : null
  if (!post) throw createError({ statusCode: 404, statusMessage: 'yazi_bulunamadi' })

  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=60')
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    tags: post.tags,
    coverUrl: post.coverUrl,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    readingMinutes: post.readingMinutes,
    html: renderMarkdown(post.contentMd),
  }
})

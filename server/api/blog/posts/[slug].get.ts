import { getPublishedPost } from '~~/server/utils/contentStore'
import { renderMarkdown } from '~~/server/utils/markdown'

/** Tek yazı: meta alanları + sunucuda render edilmiş HTML gövde. */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const post = slug ? await getPublishedPost(event, slug) : null
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

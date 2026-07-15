import { getPublishedPosts } from '~~/server/utils/contentStore'

/** Yayındaki yazıların listesi (gövdesiz) — /blog sayfası bunu okur. */
export default defineEventHandler(async (event) => {
  const posts = await getPublishedPosts(event)
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

import { getPublishedPosts } from '~~/server/utils/contentStore'
import { buildSitemapXml, getSeoBundle, loadOverrides } from '~~/server/utils/seoStore'

/** Dinamik sitemap — kod sayfaları + panel override'ları + yayındaki blog yazıları. */
export default defineEventHandler(async (event) => {
  const [bundle, overrides, posts] = await Promise.all([
    getSeoBundle(event),
    loadOverrides(event),
    getPublishedPosts(event),
  ])
  const base = bundle.settings.general.baseUrl.replace(/\/$/, '')
  const extra = posts.map((p) => ({ loc: `${base}/blog/${p.slug}`, lastmod: p.updatedAt }))
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return buildSitemapXml(bundle, overrides.updatedAt ?? {}, extra)
})

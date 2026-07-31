import { getPublishedPosts } from '~~/server/utils/contentStore'
import { destekSitemapYollari } from '~~/server/utils/destekStore'
import { buildSitemapXml, getSeoBundle, loadOverrides } from '~~/server/utils/seoStore'

/**
 * Dinamik sitemap - kod sayfaları + panel override'ları + yayındaki blog
 * yazıları + destek merkezi yazıları. Destek KATEGORİ sayfaları buraya elle
 * eklenmez; DEFAULT_PAGES'ta oldukları için KNOWN_PATHS üzerinden gelirler.
 */
export default defineEventHandler(async (event) => {
  const bundle = await getSeoBundle(event)
  const base = bundle.settings.general.baseUrl.replace(/\/$/, '')
  const [overrides, posts, destekYollari] = await Promise.all([
    loadOverrides(event),
    getPublishedPosts(event),
    destekSitemapYollari(base),
  ])
  const extra = [
    ...posts.map((p) => ({ loc: `${base}/blog/${p.slug}`, lastmod: p.updatedAt })),
    ...destekYollari.filter((y) => (y.loc.split('/destek/')[1] ?? '').includes('/')),
  ]
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return buildSitemapXml(bundle, overrides.updatedAt ?? {}, extra)
})

import { buildSitemapXml, getSeoBundle, loadOverrides } from '~~/server/utils/seoStore'

/** Dinamik sitemap — kodda var olan sayfalar + panel override'ları (include/priority/lastmod). */
export default defineEventHandler(async (event) => {
  const [bundle, overrides] = await Promise.all([getSeoBundle(event), loadOverrides(event)])
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return buildSitemapXml(bundle, overrides.updatedAt ?? {})
})

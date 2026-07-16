import { getPublishedPosts } from '~~/server/utils/contentStore'
import { getSeoBundle, xmlEscape } from '~~/server/utils/seoStore'

/** RSS 2.0 — yayındaki blog yazıları; kanal metası panel ayarlarından. */
export default defineEventHandler(async (event) => {
  const [{ settings }, posts] = await Promise.all([getSeoBundle(event), getPublishedPosts(event)])
  const g = settings.general
  const base = g.baseUrl.replace(/\/$/, '')

  const items = posts
    .map((p) => {
      const url = `${base}/blog/${p.slug}`
      const parts = [
        '    <item>',
        `      <title>${xmlEscape(p.title)}</title>`,
        `      <link>${xmlEscape(url)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
        ...(p.publishedAt ? [`      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>`] : []),
        `      <description>${xmlEscape(p.description)}</description>`,
        '    </item>',
      ]
      return parts.join('\n')
    })
    .join('\n')

  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0">\n' +
    '  <channel>\n' +
    `    <title>${xmlEscape(`${g.siteName} blog`)}</title>\n` +
    `    <link>${xmlEscape(`${base}/blog`)}</link>\n` +
    `    <description>${xmlEscape(
      'Kalori saymadan dengeli beslenme, porsiyon ölçüleri ve aile sofrası üzerine rehberler.',
    )}</description>\n` +
    '    <language>tr</language>\n' +
    (items ? items + '\n' : '') +
    '  </channel>\n' +
    '</rss>\n'
  )
})

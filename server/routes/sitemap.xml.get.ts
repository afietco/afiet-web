import { findTranslationPair, getPublishedPosts } from '~~/server/utils/contentStore'
import { supportSitemapUrls } from '~~/server/utils/supportStore'
import { releaseSitemapUrls } from '~~/server/utils/releaseStore'
import { buildSitemapXml, getSeoBundle, loadOverrides } from '~~/server/utils/seoStore'
import { blogPath } from '#shared/utils/locales'

/**
 * Dinamik sitemap - kod sayfaları + panel override'ları + yayındaki blog
 * yazıları + destek merkezi yazıları + sürüm notları. Destek KATEGORİ sayfaları
 * ve `/yenilikler` listesi buraya elle eklenmez; DEFAULT_PAGES'ta oldukları
 * için KNOWN_PATHS üzerinden gelirler.
 *
 * Blog yazıları KENDİ dilinin yolunda listelenir; çevirisi olan (translation_of
 * dolu ve karşı yazı da yayında) çiftler karşılıklı hreflang alır. Eşleşmesi
 * olmayan yazıya alternate BASILMAZ.
 *
 * `/en/blog` listesi DEFAULT_PAGES'ta `sitemap.include:false` ile durur ve
 * buradan yalnız İngilizce yazı VARSA eklenir: içi boş bir liste sayfasını
 * arama motoruna göstermek istemiyoruz (kullanıcı kararı, 6 Ağu 2026).
 */
export default defineEventHandler(async (event) => {
  const bundle = await getSeoBundle(event)
  const base = bundle.settings.general.baseUrl.replace(/\/$/, '')
  const [overrides, posts, supportUrls, releaseUrls] = await Promise.all([
    loadOverrides(event),
    getPublishedPosts(event),
    supportSitemapUrls(base),
    releaseSitemapUrls(base),
  ])

  const postUrls = posts.map((p) => {
    // Eşleme çift yönlü aranır (`translation_of` tek satıra yazılır); sayfadaki
    // hreflang ile sitemap'in AYNI kaynağı okuması bunun için önemli.
    const paired = findTranslationPair(p, posts)
    const trSlug = p.lang === 'tr' ? p.slug : paired?.slug
    const enSlug = p.lang === 'en' ? p.slug : paired?.slug
    return {
      loc: `${base}${blogPath(p.lang, p.slug)}`,
      lastmod: p.updatedAt,
      ...(paired && trSlug && enSlug
        ? {
            alternates: [
              { hreflang: 'tr', href: `${base}${blogPath('tr', trSlug)}` },
              { hreflang: 'en', href: `${base}${blogPath('en', enSlug)}` },
              { hreflang: 'x-default', href: `${base}${blogPath('tr', trSlug)}` },
            ],
          }
        : {}),
    }
  })

  /* Hub, yazı varken listeye girer. Alternates elle veriliyor çünkü bu girdi
     KNOWN_PATHS'tan değil buradan geliyor; Türkçe hub'ın alternates'i ise
     EN_BY_TR üzerinden otomatik basılıyor ve ikisi eşleşmek zorunda. */
  const enBlogHub = posts.some((p) => p.lang === 'en')
    ? [
        {
          loc: `${base}/en/blog`,
          alternates: [
            { hreflang: 'tr', href: `${base}/blog` },
            { hreflang: 'en', href: `${base}/en/blog` },
            { hreflang: 'x-default', href: `${base}/blog` },
          ],
        },
      ]
    : []

  const extra = [
    ...postUrls,
    ...enBlogHub,
    ...supportUrls.filter((y) => (y.loc.split('/destek/')[1] ?? '').includes('/')),
    ...releaseUrls,
  ]
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return buildSitemapXml(bundle, overrides.updatedAt ?? {}, extra)
})

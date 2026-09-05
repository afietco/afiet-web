import { describe, expect, it } from 'vitest'
import { buildSitemapXml } from './seoStore'
import { DEFAULT_PAGES, DEFAULT_SETTINGS } from './seoDefaults'
import type { SeoBundle } from './seoTypes'

/**
 * Sitemap yüzeyinin bekçisi.
 *
 * Buradaki iddialar 5 Eyl 2026 tarama kararını korur (gerekçe:
 * `seoStore > SITEMAP_DISI`). Yüzey sessizce büyürse tarama talebi yine
 * karşılığı olmayan adreslere dağılır ve bunu canlıda ancak haftalar sonra
 * GSC'den fark ederiz - o yüzden testle sabitlendi.
 */
const bundle: SeoBundle = {
  settings: DEFAULT_SETTINGS,
  pages: DEFAULT_PAGES,
  redirects: [],
}

const loclari = (xml: string) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.replace('https://afiet.co', ''))

describe('buildSitemapXml - tarama yüzeyi', () => {
  it('İngilizce sayfaları listelemez', () => {
    const yollar = loclari(buildSitemapXml(bundle))
    expect(yollar.filter((y) => y === '/en' || y.startsWith('/en/'))).toEqual([])
  })

  it('sürüm notu sayfalarını listelemez ama hub kalır', () => {
    const yollar = loclari(
      buildSitemapXml(bundle, {}, [
        { loc: 'https://afiet.co/yenilikler/0.11.0' },
        { loc: 'https://afiet.co/yenilikler/1.1.0' },
      ]),
    )
    expect(yollar.filter((y) => y.startsWith('/yenilikler/'))).toEqual([])
    expect(yollar).toContain('/yenilikler')
  })

  it('Türkçe sayfalar ve destek yazıları durmaya devam eder', () => {
    const yollar = loclari(
      buildSitemapXml(bundle, {}, [
        { loc: 'https://afiet.co/destek/baslangic/afiet-nedir' },
        { loc: 'https://afiet.co/blog/besin-gruplari-nelerdir' },
      ]),
    )
    expect(yollar).toContain('/')
    expect(yollar).toContain('/hesapla/gunluk-su')
    expect(yollar).toContain('/destek/baslangic/afiet-nedir')
    expect(yollar).toContain('/blog/besin-gruplari-nelerdir')
  })

  it('listede olmayan adrese hreflang alternate basmaz', () => {
    const xml = buildSitemapXml(bundle)
    // Türkçe sayfaların EN karşılığı artık listede değil; tek yönlü bir
    // alternate grubu basılmamalı.
    expect(xml).not.toContain('href="https://afiet.co/en')
  })

  it('extra girdinin alternate grubu hep ya da hiç basılır', () => {
    const xml = buildSitemapXml(bundle, {}, [
      {
        loc: 'https://afiet.co/blog/porsiyon-olculeri-el-olcusu',
        alternates: [
          { hreflang: 'tr', href: 'https://afiet.co/blog/porsiyon-olculeri-el-olcusu' },
          { hreflang: 'en', href: 'https://afiet.co/en/blog/hand-portion-sizes-without-a-scale' },
          { hreflang: 'x-default', href: 'https://afiet.co/blog/porsiyon-olculeri-el-olcusu' },
        ],
      },
    ])
    expect(loclari(xml)).toContain('/blog/porsiyon-olculeri-el-olcusu')
    // Gruptaki EN adresi dışlandığı için grubun TAMAMI düşer.
    expect(xml).not.toContain('hreflang="x-default"')
  })
})

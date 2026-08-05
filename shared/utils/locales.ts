/**
 * Çok dillilik: TR kökte yaşar (URL'ler DEĞİŞMEZ), İngilizce /en altında.
 * Bu eşleme haritası TEK kaynaktır; üç tüketicisi vardır ve üçü de yalnız
 * buradan okur:
 *   1. hreflang alternates (server/utils/seoStore.ts > resolvePageMeta)
 *   2. sitemap xhtml:link alternates (server/utils/seoStore.ts > buildSitemapXml)
 *   3. dil düğmesi (SiteHeader.vue - karşılığı olmayan sayfada görünmez)
 *
 * KURAL: Çevirisi OLMAYAN sayfa buraya girmez ve /en altında var olmaz.
 * TR içerik /en URL'i altında fallback olarak SERVİS EDİLMEZ (duplicate ve
 * soft-404 riski); hreflang yalnız gerçekten iki dilde yaşayan çiftlere basılır.
 * Yeni bir sayfa çevrildiğinde tek yapılacak şey bu haritaya satır eklemektir.
 */
export const EN_BY_TR: Record<string, string> = {
  '/': '/en',
  '/gizlilik': '/en/privacy',
  '/iletisim': '/en/contact',
  '/hesap-sil': '/en/delete-account',
}

export const TR_BY_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EN_BY_TR).map(([tr, en]) => [en, tr]),
)

export type SiteLocale = 'tr' | 'en'

/** /en ve altı İngilizcedir; gerisi Türkçe. Sorgu/çapa temizlenmiş yol bekler. */
export function localeOf(path: string): SiteLocale {
  return path === '/en' || path.startsWith('/en/') ? 'en' : 'tr'
}

/** Sayfanın öteki dildeki karşılığı; çifti yoksa null (dil düğmesi gizlenir). */
export function counterpartOf(path: string): string | null {
  const p = path.length > 1 ? path.replace(/\/+$/, '') : path
  return (localeOf(p) === 'en' ? TR_BY_EN[p] : EN_BY_TR[p]) ?? null
}

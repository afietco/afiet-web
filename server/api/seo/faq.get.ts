import { getSeoBundle } from '~~/server/utils/seoStore'

/**
 * Sitenin EFEKTİF SSS'i (kod varsayılanı + panel override'ı birleşmiş hâli).
 *
 * NEDEN VAR: Afi'nin bilgi tabanı SSS maddelerini korpusuna alıyor ama backend
 * onları landing'in Neon'undan `seo_settings` tablosunun `faq` SATIRINDAN
 * okuyordu. O satır yalnız panelden override girildiğinde var olur; prod'da
 * 29 Tem 2026'da "varsayılana dön" denince silindi ve o günden beri backend
 * boş dönüş alıyor. Sonuç: SSS belgeleri Afi'nin beyninde donup kaldı, kodda
 * ne yazarsak yazalım ona ulaşmadı ve bir maddesi aylarca "afiet yakında App
 * Store ve Google Play'de" demeye devam etti.
 *
 * Kök neden, override'ı gerçeğin kendisi sanmaktı. Efektif değeri üreten tek
 * yer `getSeoBundle`tır; bu uç onu dışarı açar ki backend de sayfayla AYNI
 * cevabı görsün.
 *
 * Public ve yan etkisizdir: döndürdüğü her şey zaten ana sayfada görünür
 * metin ve FAQPage şeması olarak yayında.
 */
export default defineEventHandler(async (event) => {
  const { settings } = await getSeoBundle(event)
  setHeader(event, 'Access-Control-Allow-Origin', '*')
  const faq = settings.faq
  return {
    enabled: faq.enabled,
    /* Boş soru ya da cevap taşıyan madde hiç gönderilmez: korpusta başlıksız
       bir belge, aramada eşleşmeyen ölü bir kayıt olur. */
    items: faq.items
      .filter((item) => item.q.trim() && item.a.trim())
      .map((item) => ({ q: item.q.trim(), a: item.a.trim(), href: item.href ?? '' })),
  }
})

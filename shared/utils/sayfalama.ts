/**
 * Liste sayfalamasının saf mantığı.
 *
 * Bileşenden AYRI durur çünkü hata riski taşıyan kısım burasıdır ve Nuxt
 * bileşenleri birim testinde koşmaz (gerekçe: `vitest.config.ts` başında).
 * Bileşenin geri kalanı - bağlantının <a> mı <button> mı olduğu - uçtan uca
 * smoke ile doğrulanır.
 */

/**
 * URL'den gelen ham sayfa numarasını geçerli aralığa çeker.
 *
 * Aralık dışı bir değer (elle yazılmış `?sayfa=99`, ya da arama listeyi
 * kısalttığında geride kalan eski numara) sessizce sınıra çekilir: boş bir
 * liste basmak, olmayan bir sayfayı varmış gibi göstermek olurdu. Sayı
 * olmayan her şey birinci sayfadır.
 */
export function sayfaNumarasi(ham: unknown, sayfaSayisi: number): number {
  const sinir = Math.max(1, Math.floor(sayfaSayisi) || 1)
  const n = Number(Array.isArray(ham) ? ham[0] : ham)
  if (!Number.isInteger(n) || n < 1) return 1
  return Math.min(n, sinir)
}

/**
 * Bir sayfanın ADRESİ.
 *
 * NEDEN YOL, SORGU DEĞİL (5 Eyl 2026): sayfalama önce `?sayfa=2` ile yazıldı
 * ve Vercel'de ÇALIŞMADI. Sebep Nitro'nun Vercel preset'inin ISR handler'ında
 * (`presets/vercel/runtime/vercel.mjs`): fonksiyon `x-now-route-matches`
 * başlığıyla çağrıldığında `req.url` YALNIZ `__isr_route`tan yeniden kurulur
 * ve sorgu dizesinin tamamı atılır -
 *
 *     if (routeRules.isr) { req.url = url }   // parametreler yok
 *
 * Aynı dosyadaki başlıksız dal `withQuery(url, params)` ile parametreleri
 * korur ama ISR yolunda o dal koşmaz. Yani `routeRules`ta `allowQuery`
 * vermek yetmiyordu: önbellek anahtarı ayrışıyor, fonksiyona parametre yine
 * ulaşmıyordu. Yol tabanlı adres bu katmanı tamamen atlar.
 *
 * YAN FAYDA: canonical `path`ten türetildiği için her sayfa artık kendine
 * canonical veriyor. Sorgulu sürümde ikinci sayfa kendini birincinin kopyası
 * ilan ediyordu, ki Google sayfalama serisinde bunu istemez.
 *
 * BİRİNCİ SAYFA `/blog`TUR, `/blog/sayfa/1` DEĞİL: aynı içeriğin iki adresi
 * olurdu ve ikisi de kendine canonical verirdi.
 */
export function sayfaYolu(taban: string, n: number, segment: string): string {
  return n > 1 ? `${taban}/${segment}/${n}` : taban
}

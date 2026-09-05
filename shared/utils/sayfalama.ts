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
 * Bir sayfanın sorgu dizesi.
 *
 * BİRİNCİ SAYFA PARAMETRE TAŞIMAZ: `?sayfa=1` ile çıplak `/blog` aynı
 * içeriğin iki adresi olurdu ve ikisi de kendine canonical verdiği için
 * arama motoruna gereksiz bir kopya çifti gösterirdi.
 *
 * Diğer parametreler KORUNUR: arama ve sıralama istemcide kalsa da adres
 * ileride onları taşırsa sayfalama onları düşürmemeli.
 */
export function sayfaSorgusu<T extends Record<string, unknown>>(
  mevcut: T,
  param: string,
  n: number,
): Record<string, unknown> {
  const q: Record<string, unknown> = { ...mevcut }
  if (n > 1) q[param] = String(n)
  else delete q[param]
  return q
}

/**
 * Türkçe metin katlama ve slug üretimi - SUNUCU VE İSTEMCİ İÇİN TEK KAYNAK.
 *
 * Neden paylaşımlı: arama dizinini sunucu üretir, eşleştirmeyi istemci yapar.
 * İki taraf farklı katlarsa kullanıcı "olcu" yazdığında "ölçü" geçen yazıyı
 * bulamaz ve bunun hata olduğu hiçbir yerde görünmez. Bu yüzden aynı dosya.
 *
 * JavaScript'in `toLowerCase()`i Türkçe'yi bilmez: 'İ' birleşik noktalı 'i̇'ye
 * düşer, 'I' ise 'i' olur. Arama için doğru davranış ikisini de 'i'ye
 * indirmektir, o yüzden harf eşlemesi küçültmeden ÖNCE uygulanır.
 */

const HARFLER: Record<string, string> = {
  ç: 'c', Ç: 'c',
  ğ: 'g', Ğ: 'g',
  ı: 'i', I: 'i', İ: 'i',
  ö: 'o', Ö: 'o',
  ş: 's', Ş: 's',
  ü: 'u', Ü: 'u',
  â: 'a', Â: 'a',
  î: 'i', Î: 'i',
  û: 'u', Û: 'u',
  // Yazılarda kesme işareti tek tırnak olarak da geçebiliyor; ikisi de düşer.
  '’': '', "'": '',
}

const HARF_DESENI = /[çÇğĞıIİöÖşŞüÜâÂîÎûÛ’']/g

/** Aksanları ve Türkçe harfleri sadeleştirip küçük harfe indirir. */
export function trKatla(metin: string): string {
  return metin.replace(HARF_DESENI, (h) => HARFLER[h] ?? h).toLowerCase()
}

/** Başlık id'si ve dosya adı için güvenli slug: yalnız a-z, 0-9 ve tire. */
export function trSlug(metin: string): string {
  return trKatla(metin)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/**
 * Aramada kullanılan kelime listesi. İki karakterden kısa parçalar atılır
 * ("ve", "bir" gibi kelimeler kalır, tek harfler gitmiş olur).
 */
export function trKelimeler(metin: string): string[] {
  return trKatla(metin)
    .split(/[^a-z0-9]+/)
    .filter((k) => k.length >= 2)
}

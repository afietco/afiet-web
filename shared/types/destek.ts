/**
 * Destek merkezinin veri tipleri - SUNUCU VE İSTEMCİ İÇİN TEK KAYNAK.
 * Sunucu bunları üretir (server/utils/destekStore.ts), sayfalar ve bileşenler
 * prop olarak tüketir. Tip ikiye bölünürse biri sessizce eskir.
 *
 * Kategori LİSTESİ burada değil, `server/utils/destekKategori.ts` içindedir:
 * istemci onu API yanıtından alır, paketine ayrıca gömmeye gerek yok.
 */

export type DestekAksan = 'sebze' | 'tahil' | 'protein' | 'meyve' | 'sut' | 'notr'

export type DestekIkonAdi = 'filiz' | 'kase' | 'afi' | 'ritim' | 'sofra' | 'kalkan' | 'pusula'

export type DestekKategori = {
  slug: string
  /** Kart ve menü başlığı. */
  baslik: string
  /** Kartın altındaki tek satır. */
  ozet: string
  /** Kategori sayfasının giriş paragrafı ve meta açıklaması. */
  aciklama: string
  aksan: DestekAksan
  ikon: DestekIkonAdi
}

/** Yazının liste/kart görünümü (gövdesiz). */
export type DestekYaziOzet = {
  slug: string
  kategori: string
  baslik: string
  ozet: string
  /** Yazının kendi güncelleme tarihi (ISO tarih, saat yok). */
  guncelleme: string
  /** Kategori içindeki sıra; küçük olan üstte. */
  sira: number
}

export type DestekBaslik = { id: string; metin: string; seviye: 2 | 3 }

/** Yazı sayfasının ihtiyacı olan her şey. */
export type DestekYazi = DestekYaziOzet & {
  html: string
  icindekiler: DestekBaslik[]
  /** Aynı kategorideki komşular (sıralı gezinme). */
  onceki: DestekYaziOzet | null
  sonraki: DestekYaziOzet | null
  ilgili: DestekYaziOzet[]
}

/** Kategori + içindeki yazılar; hub ve yan menü bunu okur. */
export type DestekKategoriDolu = DestekKategori & { yazilar: DestekYaziOzet[] }

/** Aramanın istemciye indirdiği hafif dizin satırı. */
export type DestekAramaSatiri = {
  /** kategori slug'ı */
  k: string
  /** yazı slug'ı */
  s: string
  /** başlık */
  b: string
  /** özet */
  o: string
  /** ara başlıklar + anahtar kelimeler + kategori adı (küratörlü sinyal) */
  a: string
  /** gövdenin ilk bölümü (zayıf sinyal; tek başına eşleşme sayılmaz) */
  g: string
}

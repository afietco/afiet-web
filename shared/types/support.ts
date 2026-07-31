/**
 * Destek merkezinin veri tipleri - SUNUCU VE İSTEMCİ İÇİN TEK KAYNAK.
 * Sunucu bunları üretir (server/utils/supportStore.ts), sayfalar ve bileşenler
 * prop olarak tüketir. Tip ikiye bölünürse biri sessizce eskir.
 *
 * Kategori LİSTESİ burada değil, `server/utils/supportCategories.ts`
 * içindedir: istemci onu API yanıtından alır, paketine ayrıca gömmeye gerek yok.
 */

/**
 * Kategori vurgu rengi. İlk beşi uygulamadaki besin grubu renkleridir ve
 * `main.css > @theme` içindeki token adlarıyla BİREBİR aynı olmak zorundadır
 * (Tailwind sınıfları `bg-sebze` gibi düz metin yazılır).
 */
export type SupportAccent = 'sebze' | 'tahil' | 'protein' | 'meyve' | 'sut' | 'neutral'

/** İkon adları marka kavramlarıdır (ZagIcon'daki adlandırmanın aynısı). */
export type SupportIconName =
  | 'filiz'
  | 'kase'
  | 'afi'
  | 'ritim'
  | 'sofra'
  | 'kalkan'
  | 'pusula'

export type SupportCategory = {
  slug: string
  /** Kart ve menü başlığı. */
  title: string
  /** Kartın altındaki tek satır. */
  summary: string
  /** Kategori sayfasının giriş paragrafı ve meta açıklaması. */
  description: string
  accent: SupportAccent
  icon: SupportIconName
}

/** Yazının liste/kart görünümü (gövdesiz). */
export type SupportArticleSummary = {
  slug: string
  category: string
  title: string
  summary: string
  /** Yazının kendi güncelleme tarihi (ISO tarih, saat yok). */
  updated: string
  /** Kategori içindeki sıra; küçük olan üstte. */
  order: number
}

export type SupportHeading = { id: string; text: string; level: 2 | 3 }

/** Yazı sayfasının ihtiyacı olan her şey. */
export type SupportArticle = SupportArticleSummary & {
  html: string
  toc: SupportHeading[]
  /** Aynı kategorideki komşular (sıralı gezinme). */
  previous: SupportArticleSummary | null
  next: SupportArticleSummary | null
  related: SupportArticleSummary[]
}

/** Kategori + içindeki yazılar; hub ve yan menü bunu okur. */
export type SupportCategoryWithArticles = SupportCategory & {
  articles: SupportArticleSummary[]
}

/**
 * Aramanın istemciye indirdiği hafif dizin satırı. Alan adları tek harftir:
 * yüz yazıda bu JSON'un yarısı anahtar adı olurdu.
 */
export type SupportSearchRow = {
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

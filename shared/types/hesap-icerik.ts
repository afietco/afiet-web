/**
 * Hesaplama araçlarının uzun içeriği (`/hesapla/<slug>`).
 *
 * Kaynak `content/hesapla/<slug>.md`; okuma katmanı
 * `server/utils/hesaplaStore.ts`. Tipler sunucu VE istemci için tek kaynaktır.
 */

/** Gövdedeki bir `## Başlık` bölümü; sayfada katlanır bir panel olur. */
export interface HesapSection {
  /** `trSlug(title)`; katlanır panelin anahtarı ve derin bağlantı çıpası. */
  id: string
  title: string
  /** Sunucuda markdown-it (html:false) ile üretilmiş güvenli HTML. */
  html: string
}

/** "Sık sorulanlar" bölümünden çıkan tek soru; hem panelde hem FAQPage şemasında. */
export interface HesapFaqItem {
  q: string
  /** Düz metin: şemaya bu hâliyle girer, panelde de bu basılır. */
  a: string
}

export interface HesapIcerik {
  slug: string
  sections: HesapSection[]
  faq: HesapFaqItem[]
}

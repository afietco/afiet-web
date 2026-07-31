import type { SupportAccent } from '#shared/types/support'

/**
 * Kategori vurgu renklerinin Tailwind karşılıkları. Sınıf adları kaynakta DÜZ
 * METİN olmak zorunda (Tailwind kaynağı tarar, `bg-${x}` üretmez); durum
 * sayfasındaki ve HeroSection'daki eşlemenin aynı gerekçesi.
 *
 * 'neutral' bir renk değil, bilinçli bir renksizlik: yasal ve teknik
 * kategoriler ürün konularından türce ayrı dursun diye.
 */

export const accentText: Record<SupportAccent, string> = {
  sebze: 'text-sebze',
  tahil: 'text-tahil',
  protein: 'text-protein',
  meyve: 'text-meyve',
  sut: 'text-sut',
  neutral: 'text-soft',
}

export const accentWash: Record<SupportAccent, string> = {
  sebze: 'bg-sebze/10',
  tahil: 'bg-tahil/10',
  protein: 'bg-protein/10',
  meyve: 'bg-meyve/10',
  sut: 'bg-sut/10',
  neutral: 'bg-canvas',
}

/** Kartın sol kenarındaki ince şerit. */
export const accentRail: Record<SupportAccent, string> = {
  sebze: 'bg-sebze',
  tahil: 'bg-tahil',
  protein: 'bg-protein',
  meyve: 'bg-meyve',
  sut: 'bg-sut',
  neutral: 'bg-muted',
}

export const accentBorder: Record<SupportAccent, string> = {
  sebze: 'hover:border-sebze/40',
  tahil: 'hover:border-tahil/40',
  protein: 'hover:border-protein/40',
  meyve: 'hover:border-meyve/40',
  sut: 'hover:border-sut/40',
  neutral: 'hover:border-muted/40',
}

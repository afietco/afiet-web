import type { DestekAksan } from '#shared/types/destek'

/**
 * Kategori aksan renklerinin Tailwind karşılıkları. Sınıf adları kaynakta DÜZ
 * METİN olmak zorunda (Tailwind kaynağı tarar, `bg-${x}` üretmez); durum
 * sayfasındaki ve HeroSection'daki eşlemenin aynı gerekçesi.
 *
 * 'notr' bir renk değil, bilinçli bir renksizlik: yasal ve teknik kategoriler
 * ürün konularından türce ayrı dursun diye.
 */

export const aksanMetin: Record<DestekAksan, string> = {
  sebze: 'text-sebze',
  tahil: 'text-tahil',
  protein: 'text-protein',
  meyve: 'text-meyve',
  sut: 'text-sut',
  notr: 'text-soft',
}

export const aksanZemin: Record<DestekAksan, string> = {
  sebze: 'bg-sebze/10',
  tahil: 'bg-tahil/10',
  protein: 'bg-protein/10',
  meyve: 'bg-meyve/10',
  sut: 'bg-sut/10',
  notr: 'bg-canvas',
}

/** Kartın sol kenarındaki ince şerit. */
export const aksanSerit: Record<DestekAksan, string> = {
  sebze: 'bg-sebze',
  tahil: 'bg-tahil',
  protein: 'bg-protein',
  meyve: 'bg-meyve',
  sut: 'bg-sut',
  notr: 'bg-muted',
}

export const aksanKenar: Record<DestekAksan, string> = {
  sebze: 'hover:border-sebze/40',
  tahil: 'hover:border-tahil/40',
  protein: 'hover:border-protein/40',
  meyve: 'hover:border-meyve/40',
  sut: 'hover:border-sut/40',
  notr: 'hover:border-muted/40',
}

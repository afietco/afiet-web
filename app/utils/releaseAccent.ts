/**
 * Sürüm notu bölümlerinin rengi. Bölüm başlıkları CHANGELOG'un üç emojisinden
 * türer (✨ / 🔧 / 🐛, bkz. scripts/surum-notu-taslagi.mjs); renkler destek
 * merkezindekiyle aynı token ailesinden gelir.
 *
 * Sınıf adları DÜZ METİN olmak zorunda: Tailwind kaynağı tarar, `bg-${x}`
 * üretmez (supportAccent.ts'teki gerekçenin aynısı).
 */

type Look = {
  chip: string
  /** Sayıyla birlikte okunan tekil ad: "3 düzeltme", "3 düzeltmeler" değil. */
  singular: string
}

const LOOKS: Record<string, Look> = {
  Yenilikler: { chip: 'bg-sebze/10 text-sebze', singular: 'yenilik' },
  İyileştirmeler: { chip: 'bg-tahil/10 text-tahil', singular: 'iyileştirme' },
  Düzeltmeler: { chip: 'bg-meyve/10 text-meyve', singular: 'düzeltme' },
}

/** Tanımadığımız bir başlık renksiz kalır ama görünmeye devam eder. */
export function releaseLook(heading: string): Look {
  return LOOKS[heading] ?? { chip: 'bg-canvas text-soft', singular: heading.toLocaleLowerCase('tr-TR') }
}

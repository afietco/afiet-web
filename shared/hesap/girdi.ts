/**
 * Form girdilerinin ayrıştırılması ve makul aralık denetimi.
 *
 * Motorun kendisi değil, onun kapısı: motor saf hesap yapar, "bu boy olabilir
 * mi" sorusu buraya aittir. Aralıklar tıbbi bir sınır değil, yazım hatası
 * yakalayan kaba filtrelerdir (172 yerine 1720 yazmak gibi).
 */

/** Türkçe klavyede ondalık virgülle yazılır; ikisini de kabul et. */
export function sayiyaCevir(ham: string): number | null {
  const temiz = ham.replace(',', '.').trim()
  if (!temiz) return null
  const n = Number(temiz)
  return Number.isFinite(n) ? n : null
}

export const MAKUL = {
  yas: { min: 10, max: 100 },
  boy: { min: 120, max: 230 },
  kilo: { min: 30, max: 300 },
  bel: { min: 40, max: 200 },
  boyun: { min: 20, max: 80 },
  kalca: { min: 50, max: 220 },
} as const

export type MakulAnahtar = keyof typeof MAKUL

export function makulMu(anahtar: MakulAnahtar, deger: number): boolean {
  const a = MAKUL[anahtar]
  return deger >= a.min && deger <= a.max
}

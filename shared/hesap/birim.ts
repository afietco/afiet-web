/**
 * Birim dönüşümleri - YALNIZ İngilizce araçların girdi katmanı için.
 *
 * Motor (`motor.ts`, `vucut.ts`) metrik konuşur ve @afiet/core AYNASIDIR;
 * oraya imperial bilgisi SIZMAZ. Dönüşüm burada, formun kapısında yapılır:
 * kullanıcı ft/in/lb yazar, sayfa cm/kg'ye çevirir, motor her iki dilde de
 * aynı sayıyı üretir. `girdi.ts > makulMu` de metrik tabanda çalışmaya devam
 * eder, yani makul aralık tanımı tek yerde kalır.
 *
 * Türkçe sayfalar bu dosyayı hiç kullanmaz.
 */

export type UnitSystem = 'metric' | 'imperial'

export const CM_PER_IN = 2.54
export const IN_PER_FT = 12
export const KG_PER_LB = 0.45359237

export function inToCm(inches: number): number {
  return inches * CM_PER_IN
}

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN
}

export function ftInToCm(feet: number, inches: number): number {
  return inToCm(feet * IN_PER_FT + inches)
}

/** cm → {ft, in}; inç TAM SAYIYA yuvarlanır ve 12'ye taşarsa foot'a devredilir. */
export function cmToFtIn(cm: number): { ft: number; in: number } {
  const totalIn = Math.round(cmToIn(cm))
  return { ft: Math.floor(totalIn / IN_PER_FT), in: totalIn % IN_PER_FT }
}

export function lbToKg(pounds: number): number {
  return pounds * KG_PER_LB
}

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB
}

/** ml → ABD sıvı ons (su aracının imperial gösterimi). */
export const ML_PER_US_FLOZ = 29.5735295625

export function mlToFlOz(ml: number): number {
  return ml / ML_PER_US_FLOZ
}

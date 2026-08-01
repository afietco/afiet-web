import { describe, expect, it } from 'vitest'
import { calculateGoals } from './motor'
import { bmi, bmiRange, bmr, fiberGrams, waterGlassesFromTdee } from './vucut'
import type { ActivityLevel, Sex } from './tipler'
import fikstur from './fikstur.json'

/**
 * SAPMA KİLİDİ.
 *
 * `motor.ts` ve `vucut.ts`, afiet-mobile'daki `@afiet/core`un aynasıdır.
 * `fikstur.json` GERÇEK çekirdek çalıştırılarak üretildi (mobile-v0.9.0), yani
 * buradaki beklenen değerler bu repodan değil, uygulamanın kendisinden geliyor.
 *
 * Bu test kırıldığında yapılacak: önce değişimin KASITLI olup olmadığına bak.
 * Kasıtlıysa fikstürü mobil çekirdekten yeniden üret; değilse aynayı düzelt.
 * Sessizce fikstürü güncelleyip geçmek, sitenin uygulamadan farklı sayı
 * göstermesi demektir.
 */

type Vaka = (typeof fikstur)[number]

const yuvarla = (n: number, basamak = 2) => Math.round(n * 10 ** basamak) / 10 ** basamak

describe('hedef motoru mobil çekirdekle aynı sonucu verir', () => {
  for (const vaka of fikstur as Vaka[]) {
    it(vaka.ad, () => {
      const g = vaka.girdi
      const r = calculateGoals({
        sex: g.sex as Sex,
        ageYears: g.ageYears,
        heightCm: g.heightCm,
        weightKg: g.weightKg,
        activityLevel: g.activityLevel as ActivityLevel,
        direction: 'duzen',
      })

      expect(yuvarla(bmr(g.sex as Sex, g.weightKg, g.heightCm, g.ageYears), 3)).toBe(vaka.bmr)
      expect(yuvarla(bmi(g.weightKg, g.heightCm), 3)).toBe(vaka.bmi)
      expect(bmiRange(bmi(g.weightKg, g.heightCm)).key).toBe(vaka.bmiAralik)

      expect(r.targetsWithheld).toBe(vaka.targetsWithheld)
      expect(r.rails).toEqual(vaka.rails)
      expect(r.confidence).toBe(vaka.confidence)

      if (vaka.hedefKcal === null) {
        expect(r.target).toBeNull()
      } else {
        expect(r.target).not.toBeNull()
        expect(yuvarla(r.target!.range.min)).toBe(vaka.hedefKcal.min)
        expect(yuvarla(r.target!.range.max)).toBe(vaka.hedefKcal.max)
        expect(yuvarla(r.target!.mid)).toBe(vaka.hedefKcal.mid)
      }

      if (vaka.el === null) {
        expect(r.hand).toBeNull()
      } else {
        expect(r.hand).not.toBeNull()
        expect(r.hand!.map((h) => ({ key: h.key, term: h.term, text: h.text }))).toEqual(vaka.el)
      }

      if (vaka.makro !== null) {
        expect(r.macros).not.toBeNull()
        const m = r.macros!
        expect([yuvarla(m.protein.min), yuvarla(m.protein.max)]).toEqual(vaka.makro.protein)
        expect([yuvarla(m.fat.min), yuvarla(m.fat.max)]).toEqual(vaka.makro.fat)
        expect([yuvarla(m.carb.min), yuvarla(m.carb.max)]).toEqual(vaka.makro.carb)
        expect([yuvarla(m.fiber.min), yuvarla(m.fiber.max)]).toEqual(vaka.makro.fiber)
      }

      if (vaka.su !== null) {
        const orta = (r.maintenance!.range.min + r.maintenance!.range.max) / 2
        expect(waterGlassesFromTdee(orta)).toBe(vaka.su)
        expect(yuvarla(fiberGrams(orta))).toBe(vaka.lif)
      }
    })
  }
})

describe('doktrinin sert kapıları', () => {
  it('18 yaş altında hedef üretmez', () => {
    const r = calculateGoals({
      sex: 'kadin', ageYears: 17, heightCm: 165, weightKg: 55,
      activityLevel: 'orta', direction: 'duzen',
    })
    expect(r.targetsWithheld).toBe(true)
    expect(r.target).toBeNull()
    expect(r.hand).toBeNull()
    expect(r.rails).toContain('minor')
  })

  it('el ölçüsü ondalık göstermez, aralık gösterir', () => {
    const r = calculateGoals({
      sex: 'kadin', ageYears: 34, heightCm: 172, weightKg: 74,
      activityLevel: 'orta', direction: 'duzen',
    })
    for (const el of r.hand ?? []) {
      expect(el.text).not.toMatch(/[.,]/)
      expect(el.text).toMatch(/^\d+(-\d+)? /)
    }
  })

  it('açık üreten yönde kalori tabanının altına inmez', () => {
    const r = calculateGoals({
      sex: 'kadin', ageYears: 30, heightCm: 150, weightKg: 42,
      activityLevel: 'hareketsiz', direction: 'hafifle',
    })
    if (r.target) expect(r.target.range.min).toBeGreaterThanOrEqual(1200)
  })
})

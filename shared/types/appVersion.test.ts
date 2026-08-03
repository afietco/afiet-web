import { describe, expect, it } from 'vitest'
import { compareAppVersions, emptyAppVersionGate, normalizeVersion } from './appVersion'

describe('sürüm okuma', () => {
  it('noktalı sayıyı ve baştaki v harfini kabul eder', () => {
    expect(normalizeVersion('0.10.0')).toBe('0.10.0')
    expect(normalizeVersion(' v1.2 ')).toBe('1.2')
  })

  it('tanımadığı her şeye null der', () => {
    // null "ayarlanmamış" demek; hiçbir yerde kapıya dönüşmüyor.
    expect(normalizeVersion('')).toBeNull()
    expect(normalizeVersion('yakında')).toBeNull()
    expect(normalizeVersion('1.2.3-beta')).toBeNull()
    expect(normalizeVersion(undefined)).toBeNull()
    expect(normalizeVersion(12)).toBeNull()
  })
})

describe('sürüm sıralama', () => {
  it('segment segment karşılaştırır, metin gibi değil', () => {
    expect(compareAppVersions('0.9.0', '0.10.0')).toBeLessThan(0)
    expect(compareAppVersions('0.10.0', '0.9.0')).toBeGreaterThan(0)
  })

  it('eksik segmenti sıfır sayar', () => {
    expect(compareAppVersions('1.2', '1.2.0')).toBe(0)
    expect(compareAppVersions('1.2', '1.2.1')).toBeLessThan(0)
  })
})

describe('boş kapı', () => {
  it('hiçbir eşiği olmayan iki platform döner', () => {
    // DB yokken/boşken dönen cevap budur ve hiç kimseyi kilitlememeli.
    expect(emptyAppVersionGate()).toEqual({
      ios: { latestVersion: null, minimumVersion: null, storeUrl: null, message: null },
      android: { latestVersion: null, minimumVersion: null, storeUrl: null, message: null },
    })
  })
})

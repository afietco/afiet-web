import { describe, expect, it } from 'vitest'
import { sayfaNumarasi, sayfaYolu } from './sayfalama'

describe('sayfaNumarasi', () => {
  it('geçerli numarayı olduğu gibi verir', () => {
    expect(sayfaNumarasi('2', 3)).toBe(2)
  })

  it('aralık dışını son sayfaya çeker', () => {
    // Boş liste basmaktansa var olan son sayfa gösterilir.
    expect(sayfaNumarasi('99', 2)).toBe(2)
  })

  it('sayı olmayanı ve sıfır/negatifi birinci sayfa sayar', () => {
    for (const ham of [undefined, null, '', 'abc', '0', '-3', '1.5', {}]) {
      expect(sayfaNumarasi(ham, 5)).toBe(1)
    }
  })

  it('yinelenen parametrede ilk değeri okur', () => {
    // `?sayfa=2&sayfa=3` Vue Router'da dizi olarak gelir.
    expect(sayfaNumarasi(['2', '3'], 5)).toBe(2)
  })

  it('sayfa sayısı bozukken bile en az 1 döner', () => {
    expect(sayfaNumarasi('2', 0)).toBe(1)
    expect(sayfaNumarasi('2', Number.NaN)).toBe(1)
  })
})

describe('sayfaYolu', () => {
  it('birinci sayfa taban adrestir, /sayfa/1 DEĞİL', () => {
    expect(sayfaYolu('/blog', 1, 'sayfa')).toBe('/blog')
  })

  it('sonraki sayfalar yol segmenti alır', () => {
    expect(sayfaYolu('/blog', 2, 'sayfa')).toBe('/blog/sayfa/2')
    expect(sayfaYolu('/blog', 10, 'sayfa')).toBe('/blog/sayfa/10')
  })

  it('dile göre farklı taban ve segmentle çalışır', () => {
    expect(sayfaYolu('/en/blog', 2, 'page')).toBe('/en/blog/page/2')
    expect(sayfaYolu('/en/blog', 1, 'page')).toBe('/en/blog')
  })

  it('sorgu dizesi ÜRETMEZ', () => {
    // Gerekçe: Nitro'nun Vercel ISR handler'ı sorguyu atıyor
    // (bkz. sayfaYolu doc yorumu). Adreste ? görünürse regresyondur.
    expect(sayfaYolu('/blog', 3, 'sayfa')).not.toContain('?')
  })
})

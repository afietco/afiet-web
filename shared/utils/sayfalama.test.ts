import { describe, expect, it } from 'vitest'
import { sayfaNumarasi, sayfaSorgusu } from './sayfalama'

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

describe('sayfaSorgusu', () => {
  it('birinci sayfa parametre TAŞIMAZ', () => {
    expect(sayfaSorgusu({ sayfa: '3' }, 'sayfa', 1)).toEqual({})
  })

  it('sonraki sayfalar parametre taşır', () => {
    expect(sayfaSorgusu({}, 'sayfa', 2)).toEqual({ sayfa: '2' })
  })

  it('diğer parametreleri korur', () => {
    expect(sayfaSorgusu({ q: 'porsiyon', sayfa: '2' }, 'sayfa', 1)).toEqual({ q: 'porsiyon' })
    expect(sayfaSorgusu({ q: 'porsiyon' }, 'sayfa', 3)).toEqual({ q: 'porsiyon', sayfa: '3' })
  })

  it('girdiyi değiştirmez', () => {
    const girdi = { sayfa: '2' }
    sayfaSorgusu(girdi, 'sayfa', 1)
    expect(girdi).toEqual({ sayfa: '2' })
  })

  it('dile göre farklı parametre adıyla çalışır', () => {
    expect(sayfaSorgusu({}, 'page', 2)).toEqual({ page: '2' })
  })
})

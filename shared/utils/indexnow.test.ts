import { describe, expect, it } from 'vitest'

import { govdeKur, kabulEdildi, INDEXNOW_URL_TAVANI } from './indexnow.mjs'

describe('indexnow gövdesi', () => {
  it('anahtarın adresini anahtarın kendisinden türetir', () => {
    const govde = govdeKur({
      host: 'afiet.co',
      anahtar: 'a1075112973545c26d0ef292e4206d34',
      urls: ['https://afiet.co/blog/bulgur'],
    })
    // Anahtar dosyasının ADI anahtardır ve İÇERİĞİ de aynı anahtardır; adres
    // bu yüzden hesaplanır, ayrı bir sabit olarak tutulmaz.
    expect(govde.keyLocation).toBe('https://afiet.co/a1075112973545c26d0ef292e4206d34.txt')
    expect(govde.key).toBe('a1075112973545c26d0ef292e4206d34')
    expect(govde.urlList).toEqual(['https://afiet.co/blog/bulgur'])
  })

  it('host dışı adresi gönderim ÖNCESİ reddeder', () => {
    // Uç böyle bir listeye 422 döner ve isteğin tamamını düşürür, yani bir
    // yabancı adres yanındaki doğruları da iptal eder.
    expect(() =>
      govdeKur({
        host: 'afiet.co',
        anahtar: 'abc123abc123abc1',
        urls: ['https://afiet.co/blog/x', 'https://baska.com/y'],
      }),
    ).toThrow(/host dışı/)
  })

  it('anahtarsız gövde kurmaz', () => {
    expect(() => govdeKur({ host: 'afiet.co', anahtar: '', urls: ['https://afiet.co/x'] }))
      .toThrow(/anahtar/)
  })

  it('boş listeyi reddeder', () => {
    expect(() => govdeKur({ host: 'afiet.co', anahtar: 'abc123abc123abc1', urls: [] }))
      .toThrow(/URL yok/)
  })

  it('tek istekteki üst sınırı aşmaz', () => {
    const urls = Array.from({ length: INDEXNOW_URL_TAVANI + 1 }, (_, i) => `https://afiet.co/${i}`)
    expect(() => govdeKur({ host: 'afiet.co', anahtar: 'abc123abc123abc1', urls })).toThrow(/en fazla/)
  })
})

describe('kabul kodları', () => {
  it('202yi de kabul sayar', () => {
    // 202 ilk gönderimlerde normaldir: uç anahtarı henüz doğrulamamıştır.
    // Başarısızlık sayılsaydı yazı damgalanmaz ve sonsuza dek yeniden
    // bildirilirdi, ki 429 (kısıtlama) tam olarak böyle kazanılır.
    expect(kabulEdildi(202)).toBe(true)
    expect(kabulEdildi(200)).toBe(true)
  })

  it('403 ve 422yi kabul saymaz', () => {
    expect(kabulEdildi(403)).toBe(false)
    expect(kabulEdildi(422)).toBe(false)
    expect(kabulEdildi(429)).toBe(false)
  })
})

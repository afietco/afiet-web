import { describe, expect, it } from 'vitest'

import { anahtarCoz } from './buyurReport'

/**
 * `anahtarCoz` panelin okunurluğunu taşıyan tek saf fonksiyon: buyur
 * sayfasındaki ham `data-tik` anahtarını insanın okuyacağı etikete çevirir.
 * Kritik davranışı, TANIMADIĞI anahtarı da göstermesidir - etiketi eksik diye
 * bir bağlantının tıklarını gizlemek veri kaybıdır.
 */
describe('anahtarCoz', () => {
  const basliklar = new Map([['bulgur-hangi-besin-grubuna-girer', 'Bulgur hangi besin grubuna girer?']])

  it('sabit anahtarları etiketler ve gruplar', () => {
    expect(anahtarCoz('appstore', basliklar)).toEqual({ etiket: 'App Store', grup: 'magaza' })
    expect(anahtarCoz('play', basliklar)).toEqual({ etiket: 'Google Play', grup: 'magaza' })
  })

  it('blog anahtarını yazının başlığına çevirir', () => {
    expect(anahtarCoz('blog:bulgur-hangi-besin-grubuna-girer', basliklar)).toEqual({
      etiket: 'Bulgur hangi besin grubuna girer?',
      grup: 'icerik',
    })
  })

  it('başlığı bilinmeyen blog yazısında slug ile devam eder', () => {
    expect(anahtarCoz('blog:silinmis-yazi', basliklar)).toEqual({ etiket: 'silinmis-yazi', grup: 'icerik' })
  })

  it('sürüm, sosyal ve ince bağlantı önekelerini çözer', () => {
    expect(anahtarCoz('surum:1.0.0', basliklar)).toEqual({ etiket: 'Sürüm 1.0.0', grup: 'icerik' })
    expect(anahtarCoz('sosyal:instagram', basliklar)).toEqual({ etiket: 'Instagram', grup: 'sosyal' })
    expect(anahtarCoz('ince:basin', basliklar)).toEqual({ etiket: 'Basın kiti', grup: 'icerik' })
  })

  it('tanımadığı anahtarı ham hâliyle "diğer" grubunda gösterir', () => {
    expect(anahtarCoz('yepyeni-kart', basliklar)).toEqual({ etiket: 'yepyeni-kart', grup: 'diger' })
    expect(anahtarCoz('sosyal:threads', basliklar)).toEqual({ etiket: 'threads', grup: 'sosyal' })
  })
})

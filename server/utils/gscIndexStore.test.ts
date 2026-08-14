import { describe, expect, it } from 'vitest'
import { classify } from './gscIndexStore'

/**
 * Sınıflandırma bu işin en kırılgan yeri: Google'ın cevabındaki tek düz metin
 * alanı yerelleştirilmiş, geri kalanı enum. Aşağıdaki girdiler uydurma değil,
 * 14 Ağustos 2026'da afiet.co için gerçekten dönen cevaplardan alındı.
 */
describe('classify', () => {
  it('PASS gelen sayfayı indekste sayar', () => {
    expect(classify({
      verdict: 'PASS',
      coverageState: 'Submitted and indexed',
      robotsTxtState: 'ALLOWED',
      indexingState: 'INDEXING_ALLOWED',
    })).toBe('indexed')
  })

  it('meta etiketiyle engelleneni noindex sayar', () => {
    // /en ve ona canonical'lanan sayfaların 14 Ağu'daki gerçek cevabı.
    expect(classify({
      verdict: 'NEUTRAL',
      coverageState: 'Excluded by "noindex" tag',
      robotsTxtState: 'ALLOWED',
      indexingState: 'BLOCKED_BY_META_TAG',
    })).toBe('noindex')
  })

  it('HTTP başlığıyla engelleneni de noindex sayar', () => {
    expect(classify({ verdict: 'NEUTRAL', indexingState: 'BLOCKED_BY_HTTP_HEADER' })).toBe('noindex')
  })

  it('robots engelini noindexten ayırır', () => {
    // İkisi birden geldiğinde robots kazanır: sayfa hiç alınmadığı için
    // meta etiketi hakkında söylenen şey zaten bir tahmindir.
    expect(classify({
      verdict: 'NEUTRAL',
      robotsTxtState: 'DISALLOWED',
      indexingState: 'BLOCKED_BY_META_TAG',
    })).toBe('robots_blocked')
  })

  it('keşfedildi, tarandı ve bilinmiyor durumlarını ayırır', () => {
    expect(classify({ verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' })).toBe('discovered')
    expect(classify({ verdict: 'NEUTRAL', coverageState: 'Crawled - currently not indexed' })).toBe('crawled')
    expect(classify({ verdict: 'NEUTRAL', coverageState: 'URL is unknown to Google' })).toBe('unknown')
  })

  it('noindex kararını verdict yerine enum alanından verir', () => {
    /* Bu testin varlık sebebi: 9 Ağustos denetiminde noindex sayfaların
       verdict'i de NEUTRAL'dı, yani yalnız verdict'e bakan bir sınıflandırma
       onları "keşfedildi" sayardı ve gerileme hiç görünmezdi. */
    expect(classify({ verdict: 'NEUTRAL', indexingState: 'BLOCKED_BY_META_TAG' }))
      .not.toBe(classify({ verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' }))
  })

  it('tanımadığı cevabı uydurmaz', () => {
    expect(classify({})).toBe('other')
    expect(classify({ verdict: 'VERDICT_UNSPECIFIED', coverageState: 'Something new Google invented' })).toBe('other')
  })

  it('yerelleştirilmiş metin geldiğinde bile enum kararı bozulmaz', () => {
    /* İstemci İngilizce istiyor ama biri bunu değiştirirse: enum'a dayanan
       kararlar aynen çalışmaya devam etmeli. Yalnız üç NEUTRAL alt durumu
       metne bağlıdır ve onlar 'other'a düşer, sessizce yanlış sayılmaz. */
    expect(classify({ verdict: 'PASS', coverageState: 'Gönderildi ve dizine eklendi' })).toBe('indexed')
    expect(classify({ verdict: 'NEUTRAL', indexingState: 'BLOCKED_BY_META_TAG', coverageState: '"noindex" etiketi tarafından hariç tutuldu' })).toBe('noindex')
    expect(classify({ verdict: 'NEUTRAL', coverageState: 'Keşfedildi - şu anda dizine eklenmiş değil' })).toBe('other')
  })
})

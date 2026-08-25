import { describe, expect, it } from 'vitest'
import { detectAiBot, loglanirMi } from './botStore'
import { AI_BOTS, IZLENEN_BOTLAR } from './seoDefaults'

/**
 * `detectAiBot` bu ölçümün tamamının kapısıdır: buradan null dönen istek
 * `ai_bot_hits`e HİÇ yazılmaz ve geriye dönük üretilemez. Testler o yüzden
 * gerçek user agent metinleriyle yazıldı (prod tablosundan alınanlar
 * "ölçüldü" notuyla işaretli).
 */
describe('detectAiBot', () => {
  it('prod tablosundaki gerçek UA metinlerini tanır', () => {
    // Hepsi ai_bot_hits'ten birebir alındı (11-24 Ağu 2026).
    const olculen: [string, string][] = [
      [
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.4; +https://openai.com/gptbot)',
        'GPTBot',
      ],
      [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot',
        'OAI-SearchBot',
      ],
      [
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot) Chrome/119.0.6045.214 Safari/537.36',
        'Amazonbot',
      ],
      ['CCBot/2.0 (https://commoncrawl.org/faq/)', 'CCBot'],
      [
        'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
        'PerplexityBot',
      ],
      [
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)',
        'ChatGPT-User',
      ],
    ]
    for (const [ua, beklenen] of olculen) expect(detectAiBot(ua)).toBe(beklenen)
  })

  it('24 Ağu 2026 denetiminde eklenen arama motorlarını tanır', () => {
    expect(
      detectAiBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'),
    ).toBe('Googlebot')
    expect(
      detectAiBot('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'),
    ).toBe('Bingbot')
    expect(
      detectAiBot(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
      ),
    ).toBe('Applebot')
    expect(detectAiBot('Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)')).toBe(
      'YandexBot',
    )
  })

  it('meta-externalagent ile Meta-ExternalFetcher AYRI satırlara düşer', () => {
    // İkisi karıştırılırsa "eğitim mi kullanıcı mı" ayrımı kaybolur.
    expect(
      detectAiBot(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 (compatible; meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler))',
      ),
    ).toBe('meta-externalagent')
    expect(
      detectAiBot('meta-externalfetcher/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)'),
    ).toBe('Meta-ExternalFetcher')
  })

  it('robots.txt anahtarları TESPİT edilmez (istek atmazlar)', () => {
    // Google-Extended ve Applebot-Extended birer izin anahtarıdır, tarayıcı
    // değil. Listede kalsalardı panelde sonsuza kadar "hiç gelmedi" satırı
    // üretirlerdi. Applebot-Extended metni yine de bir sonuç döner çünkü düz
    // "Applebot" onun içinde geçiyor; önemli olan uydurma bir satır olmaması.
    expect(IZLENEN_BOTLAR.some((b) => b.agent === 'Google-Extended')).toBe(false)
    expect(IZLENEN_BOTLAR.some((b) => b.agent === 'Applebot-Extended')).toBe(false)
    // robots.txt politikasında ise DURMAYA devam ederler.
    expect(AI_BOTS.some((b) => b.agent === 'Google-Extended')).toBe(true)
    expect(AI_BOTS.some((b) => b.agent === 'Applebot-Extended')).toBe(true)
  })

  it('tanınmayan botu jetonla biriktirir', () => {
    expect(detectAiBot('Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)')).toBe(
      '?semrushbot',
    )
    expect(detectAiBot('Mozilla/5.0 (compatible; DataForSeoBot/1.0; +https://dataforseo.com/dataforseo-bot)')).toBe(
      '?dataforseobot',
    )
    expect(detectAiBot('Barkrowler/0.9 (+https://babbar.tech/crawler)')).toBe('?barkrowler')
  })

  it('insan tarayıcısını ve iç isteklerimizi bot saymaz', () => {
    const insan = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
      // ISR tazelemesinin iç isteği; botun kendi isteği DEĞİL.
      'node',
      '',
    ]
    for (const ua of insan) expect(detectAiBot(ua)).toBeNull()
  })

  it('uzun ad kısa adı yemez', () => {
    // Liste uzunluğa göre sıralı olmasaydı "Applebot" ⊂ "Applebot-Extended"
    // gibi çiftlerde kısa ad kazanırdı. Bugünkü listede en uzun ad budur.
    const uzunlar = IZLENEN_BOTLAR.map((b) => b.agent).filter((a) =>
      IZLENEN_BOTLAR.some((b) => b.agent !== a && b.agent.toLowerCase().includes(a.toLowerCase())),
    )
    for (const kisa of uzunlar) {
      const uzun = IZLENEN_BOTLAR.find(
        (b) => b.agent !== kisa && b.agent.toLowerCase().includes(kisa.toLowerCase()),
      )!
      expect(detectAiBot(`Mozilla/5.0 (compatible; ${uzun.agent}/1.0)`)).toBe(uzun.agent)
    }
  })
})

describe('loglanirMi', () => {
  it('ölçümün en değerli yollarını atlamaz', () => {
    for (const yol of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/llms-full.txt', '/', '/blog'])
      expect(loglanirMi(yol)).toBe(true)
  })

  it('kendi iç isteklerimizi ve varlıkları atlar', () => {
    for (const yol of ['/api/seo/meta', '/__nuxt_error', '/_nuxt/app.js', '/og.png', '/icon.svg'])
      expect(loglanirMi(yol)).toBe(false)
  })
})

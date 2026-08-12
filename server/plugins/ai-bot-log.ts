import type { H3Event } from 'h3'
import { botSql, detectAiBot, ensureBotTables, insertBotHit, loglanirMi } from '~~/server/utils/botStore'

/**
 * AI tarayıcı isteklerini `ai_bot_hits`e yazar. Gerekçe, kapsam sınırı ve
 * IP doktrini `server/utils/botStore.ts` başındaki bloktadır.
 *
 * NEDEN MIDDLEWARE DEĞİL PLUGIN: `server/middleware/*` istek İŞLENMEDEN önce
 * koşar, orada durum kodu henüz yoktur; sorunun yarısı ("2xx mi dönüyor,
 * 429 var mı") tam olarak durum kodudur.
 *
 * NEDEN `afterResponse` DEĞİL `beforeResponse` (PROD'DA ÖLÇÜLDÜ, 11 Ağu 2026):
 * ilk sürüm `afterResponse` kullanıyordu ve yerelde kusursuz çalıştı, PROD'DA
 * TEK SATIR YAZMADI. Vercel'in Node runtime'ı yanıt flush edilir edilmez
 * invocation'ı dondurduğu için yanıttan SONRA başlayan iş bitmiyor; hata bile
 * loglanmıyor, çünkü kod oraya hiç varmıyor. Teşhisin kanıtı: `ai_bot_hits`
 * tablosu prod'da OLUŞMUŞTU (ensureBotTables koştu) ama INSERT düşmemişti.
 * Bu, Cloud Run'ın "yanıt yazılınca CPU'yu kesmesi" tuzağının aynısıdır.
 * `beforeResponse` ise h3 tarafından yanıt gövdesi yazılmadan ÖNCE await
 * edilir (`await options.onBeforeResponse(...)` → `handleHandlerResponse(...)`),
 * yani yazım bitmeden istek kapanmaz. Bedeli: bot isteklerine bir Neon gidiş
 * dönüşü kadar gecikme eklenir. İnsan trafiği etkilenmez, orada yapılan tek
 * iş user agent'ın taranmasıdır. `afterResponse`a GERİ DÖNME.
 *
 * HATA YANITLARI: bir istek hata ile bitince h3'ün hata yolu yanıtı kendisi
 * gönderip `event.handled`ı işaretliyor, yani GERÇEK event hiçbir yanıt
 * kancasına uğramıyor. Nuxt o sırada hata sayfasını ayrı bir iç istekle
 * (`/__nuxt_error?url=...&statusCode=...`) render ediyor ve o istek gelen
 * isteğin header'larını (dolayısıyla bot UA'sını) miras alıyor. Gerçek yol ve
 * gerçek durum kodu o adresin sorgu parametrelerindedir; 404/5xx'i yakalamanın
 * güvenilir yolu bu. Nuxt iç sözleşmesine dayandığı için savunmacı yazıldı:
 * parametreler okunamazsa satır yazılmaz, hiçbir şey kırılmaz.
 */
async function kaydet(event: H3Event, path: string, status: number) {
  try {
    const ctx = event.context as { aiBotYazildi?: boolean }
    if (ctx.aiBotYazildi) return

    const ua = getRequestHeader(event, 'user-agent') || ''
    const bot = detectAiBot(ua)
    if (!bot) return
    if (!loglanirMi(path)) return

    const sql = botSql(event)
    if (!sql) return

    // Bayrak DB'ye gitmeden önce dikilir ki aynı event iki kez yazmasın.
    ctx.aiBotYazildi = true

    await ensureBotTables(sql)
    await insertBotHit(sql, {
      bot,
      // UA'lar uzun olabiliyor; kanonik ad zaten `bot` kolonunda, ham metin
      // yalnız sürüm/doğrulama incelemesi için saklanıyor.
      ua: ua.slice(0, 500),
      host: getRequestHost(event) || '',
      path: path.slice(0, 500),
      method: event.method || 'GET',
      status,
    })
  } catch (err) {
    console.error('[ai-bot] kayıt yazılamadı:', err)
  }
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', async (event) => {
    const raw = event.path || '/'

    if (raw.startsWith('/__nuxt_error')) {
      const q = getQuery(event)
      const gercekYol = typeof q.url === 'string' ? q.url.split('?')[0] : ''
      const durum = Number(q.statusCode)
      // Yalnız gerçekten hata olan render kaydedilir; bu iç isteğin kendi
      // durumu 200'dür ve gerçek kodun yerine geçemez.
      if (!gercekYol || !Number.isFinite(durum) || durum < 400) return
      await kaydet(event, gercekYol, durum)
      return
    }

    await kaydet(event, raw.split('?')[0] || '/', getResponseStatus(event))
  })
})

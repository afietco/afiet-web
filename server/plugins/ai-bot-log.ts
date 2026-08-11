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
 * NEDEN İKİ KANCA: ölçüldü (Nuxt 4.4.8 / Nitro 2.13.4 / h3 1.15.11) -
 * bir istek hata ile bitince h3'ün hata yolu yanıtı kendisi gönderip
 * `event.handled`ı işaretliyor ve `afterResponse`a HİÇ uğramıyor. O yolda
 * `afterResponse` yalnız Nuxt'un hata sayfasını render eden iç
 * `/__nuxt_error?...` isteği için, üstelik 200 durumuyla ateşleniyor. Yani
 * tek başına `afterResponse` bütün 404/5xx'leri sessizce kaybederdi, ki
 * ölçmek istediğimiz şeylerin başında onlar geliyor. Bu yüzden başarı yolu
 * `afterResponse`, hata yolu `error` kancasıdır; `event.context` üzerindeki
 * bayrak bir isteğin iki kez yazılmasını engeller.
 *
 * DAYANIKLILIK: `afterResponse` Nitro tarafından await edilir, yani 2xx
 * yazımı serverless'ta bitmeden fonksiyon dondurulmaz. `error` kancası await
 * EDİLMEZ ama Nitro promise'i `event.waitUntil`e devreder; platform bunu
 * sağlamıyorsa nadiren bir hata satırı düşebilir. Ödünç bilinçli: hata
 * yanıtları seyrek, 2xx yolu ise garanti.
 *
 * HİÇBİR KOŞULDA SİTEYİ KIRMAZ: her iki kanca da yutucu try/catch içinde,
 * DB yoksa (dev, boş env) sessizce çıkar. İnsan trafiğinde yapılan tek iş
 * UA'nın taranmasıdır.
 */
async function kaydet(event: H3Event, status: number) {
  try {
    const ctx = event.context as { aiBotYazildi?: boolean }
    if (ctx.aiBotYazildi) return

    const ua = getRequestHeader(event, 'user-agent') || ''
    const bot = detectAiBot(ua)
    if (!bot) return

    const path = (event.path || '/').split('?')[0] || '/'
    if (!loglanirMi(path)) return

    const sql = botSql(event)
    if (!sql) return

    // Bayrak DB'ye gitmeden önce dikilir: iki kanca da koşarsa ikincisi
    // yazmadan döner.
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
  nitroApp.hooks.hook('afterResponse', async (event) => {
    await kaydet(event, getResponseStatus(event))
  })

  nitroApp.hooks.hook('error', async (error, ctx) => {
    if (!ctx.event) return
    const status = (error as { statusCode?: number })?.statusCode ?? 500
    // captureError yanıtı 200 ile biten yakalanmış hatalar için de çağrılıyor;
    // yalnız gerçekten hata yanıtına dönüşenler kaydedilir.
    if (status < 400) return
    await kaydet(ctx.event, status)
  })
})

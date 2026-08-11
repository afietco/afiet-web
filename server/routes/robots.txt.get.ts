import { buildRobotsTxt, getSeoBundle } from '~~/server/utils/seoStore'

/**
 * Dinamik robots.txt - AI bot izinleri ve ek kurallar panelden yönetilir.
 * (Statik public/robots.txt kaldırıldı; bu route onun yerini alır.)
 */
export default defineEventHandler(async (event) => {
  const bundle = await getSeoBundle(event)
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  /**
   * CDN cache'i BİLEREK YOK (`s-maxage` verilmez; kardeş route'lar 300/900
   * kullanır). Sebep ölçüm: bu dosya AI tarayıcı nabzının tek güvenilir
   * kaynağı ([[ai_bot_hits]], server/utils/botStore.ts) ve tarayıcılar taramaya
   * hep buradan başlar. `s-maxage=300` varken aynı 5 dakikaya düşen ikinci bot
   * CDN'den servis edilip fonksiyona hiç uğramıyor, yani kaydedilmiyordu;
   * tarama dalgalar hâlinde geldiği için bu, tam da aktivitenin yoğun olduğu
   * anda sistematik eksik sayım demekti. Maliyet ihmal edilebilir: dosya 8
   * satır ve ayarlar 60 sn'lik bellek cache'inden okunuyor.
   */
  setHeader(event, 'Cache-Control', 'public, max-age=0')
  return buildRobotsTxt(bundle.settings)
})

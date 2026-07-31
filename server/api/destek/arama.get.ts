import { destekAramaDizini } from '~~/server/utils/destekStore'

/**
 * Arama dizini. İstemci bunu arama kutusuna İLK odaklandığında indirir, sayfa
 * açılışını yavaşlatmaz. Eşleştirme tamamen tarayıcıda yapılır: dış arama
 * servisi yok, her tuş vuruşunda sunucuya istek yok.
 *
 * Dizin deploy'dan deploy'a değişir, o yüzden uzun kenar önbelleği güvenli.
 */
export default defineEventHandler(async (event) => {
  const satirlar = await destekAramaDizini()
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=3600')
  return { satirlar }
})

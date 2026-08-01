import { supportSearchIndex } from '~~/server/utils/supportStore'

/**
 * Arama dizini. İstemci bunu arama kutusuna İLK odaklandığında indirir, sayfa
 * açılışını yavaşlatmaz. Eşleştirme tamamen tarayıcıda yapılır: dış arama
 * servisi yok, her tuş vuruşunda sunucuya istek yok.
 *
 * Dizin deploy'dan deploy'a değişir, o yüzden uzun kenar önbelleği güvenli.
 */
export default defineEventHandler(async (event) => {
  const rows = await supportSearchIndex()
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=3600')
  return { rows }
})

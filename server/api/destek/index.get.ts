import { destekKategorileri } from '~~/server/utils/destekStore'

/**
 * Destek merkezi haritası: kategoriler ve içindeki yazı özetleri (gövdesiz).
 * Hub ve kategori sayfaları ile yazı sayfasının sol menüsü bunu okur.
 */
export default defineEventHandler(async (event) => {
  const kategoriler = await destekKategorileri()
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return {
    kategoriler,
    toplam: kategoriler.reduce((n, k) => n + k.yazilar.length, 0),
  }
})

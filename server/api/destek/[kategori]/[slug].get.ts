import { destekYaziGetir } from '~~/server/utils/destekStore'
import { destekKategori } from '~~/server/utils/destekKategori'

/**
 * Tek destek yazısı: render edilmiş gövde, içindekiler, komşular ve ilgili
 * yazılar. Bilinmeyen kategori/slug GERÇEK 404 döner; sayfa da 404'e düşer
 * (sitede soft-404 yok, app/error.vue devreye girer).
 */
export default defineEventHandler(async (event) => {
  const kategoriSlug = getRouterParam(event, 'kategori') ?? ''
  const slug = getRouterParam(event, 'slug') ?? ''

  const kategori = destekKategori(kategoriSlug)
  if (!kategori) throw createError({ statusCode: 404, statusMessage: 'kategori_yok' })

  const yazi = await destekYaziGetir(kategoriSlug, slug)
  if (!yazi) throw createError({ statusCode: 404, statusMessage: 'yazi_yok' })

  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return { kategori, yazi }
})

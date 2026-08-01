import { getHesapIcerik } from '~~/server/utils/hesaplaStore'

/**
 * Bir hesaplama aracının uzun içeriği: katlanır bölümler + SSS.
 *
 * Bilinmeyen slug burada HATA DEĞİL, bir durumdur: `icerik: null` döner ve sayfa
 * yalnız hesabı gösterir. Bu uç 404 verseydi hesap çalışan bir sayfa, içeriği
 * eksik diye markalı hata ekranına düşerdi (sürüm notlarındaki dersin aynısı).
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') ?? ''
  const icerik = slug ? await getHesapIcerik(slug) : null

  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return { icerik }
})

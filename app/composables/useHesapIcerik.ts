import type { HesapIcerik } from '#shared/types/hesap-icerik'

/**
 * Hesaplama sayfasının uzun içeriğini çeker (`content/hesapla/<slug>.md`).
 *
 * Beş hesap sayfası da tek satırla bağlansın diye composable: içerik SSR'da
 * çekilir ve ilk HTML'e basılır, yani arama motoru katlanmış bölümleri de
 * görür. İçerik yoksa `null` döner ve sayfa yalnız hesabı gösterir; eksik
 * metin çalışan bir hesabı düşürmez.
 */
export function useHesapIcerik(slug: string) {
  const { data } = useFetch(`/api/hesapla/${slug}`, {
    key: `hesap-icerik:${slug}`,
    default: () => null,
  })

  return computed<HesapIcerik | null>(() => data.value?.icerik ?? null)
}

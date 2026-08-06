import type { UnitSystem } from '#shared/hesap/birim'

const KEY = 'afiet_units'

/**
 * İngilizce araçların birim tercihi; araçlar arasında hatırlanır.
 *
 * Varsayılan `imperial`: İngilizce arayan en büyük kitle ABD ve orada ft/in/lb
 * beklenir. Tercih localStorage'da yaşar ve YALNIZ onMounted'da okunur;
 * setup'ta okumak sunucuda basılan HTML ile istemcinin ilk render'ını ayırır
 * (hidrasyon uyumsuzluğu). Sunucu her zaman varsayılanı basar, istemci
 * bağlandıktan sonra tercihi uygular.
 *
 * Analitik ya da sunucu tarafı YOK: hesap sayfalarının gizlilik cümlesi
 * "girdiğin bilgiler tarayıcından çıkmaz" diyor, bu tercih de çıkmaz.
 */
export function useUnitSystem() {
  const system = useState<UnitSystem>('afiet-units', () => 'imperial')

  onMounted(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved === 'metric' || saved === 'imperial') system.value = saved
    } catch {
      /* localStorage engelli olabilir; varsayılanla devam */
    }
  })

  watch(system, (value) => {
    try {
      localStorage.setItem(KEY, value)
    } catch {
      /* yut */
    }
  })

  const imperial = computed(() => system.value === 'imperial')
  return { system, imperial }
}

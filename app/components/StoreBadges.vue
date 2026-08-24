<script setup lang="ts">
import { MAGAZA } from '#shared/utils/marka'

/**
 * Mağaza rozetleri. Her rozet KENDİ bayrağına bakar
 * (`#shared/utils/marka > MAGAZA`, şemayla aynı kaynak): bugün App Store
 * rozeti bağlantı, Google Play rozeti "yolda" bilgisi taşıyan pasif bir
 * etikettir. Bayrak açıldığı gün ikinci rozet de bağlantıya döner, başka bir
 * yere dokunmak gerekmez.
 *
 * Rozet karışık durumda da AYNI bileşendir: iki mağazayı yan yana göstermek,
 * Android ziyaretçisine "bu uygulama sende de var" demeden "yolda" demenin
 * tek dürüst yolu. Play rozeti tıklanamaz, çünkü adres bugün 404.
 *
 * Bağlantı hâlinde iki şey daha yapar:
 *  - `magaza_tik` olayı gönderir (birinci-taraf analitik, onay kapısından
 *    geçer). Bu, Google Ads'e elle yüklenen web dönüşümünün kaynağıdır.
 *  - Play adresine `referrer` ekler: `utm_source=afiet.co&utm_medium=web&
 *    utm_campaign=<sayfa yolu>` ve varsa reklam tıklama kimliği. Play bu
 *    parametreyi uygulamaya Install Referrer olarak taşır; uygulama ilk
 *    açılışta okuyup kanal etiketi olarak telemetriye yazar (mobil tarafı
 *    ayrı iş). Tıklama kimliği yalnız analitik onayı varsa eklenir
 *    (`$afietClickId` onaya bakar); UTM'ler kişisel veri değildir, hep gider.
 *  - App Store adresine kampanya parametresi EKLENMEZ: Apple'ın kampanya
 *    bağlantısı sağlayıcı jetonu (pt) ister, o olmadan ct yok sayılır.
 *
 * `soonLabel` /en sayfalarında "On the way" olarak geçilir; yalnız kapalı
 * mağazanın rozetinde görünür.
 *
 * Rozetin kendi metin rengi VARDIR (`text-ink`) ve miras alınmaz: kart açık
 * zeminlidir ama bileşen koyu bölümlerin içinde de duruyor (indirme sayfasının
 * hero'su, /en). Renk miras alındığında mağaza adı beyaz kartta beyaz kalıyor
 * ve rozet sessizce okunmaz oluyordu.
 */
const props = withDefaults(defineProps<{ size?: 'sm' | 'lg'; soonLabel?: string }>(), {
  soonLabel: 'Yolda',
})

type Store = { key: 'appstore' | 'play'; label: string; href: string; live: boolean; platform: string }

const route = useRoute()
const { $afietEvent, $afietClickId } = useNuxtApp()

// Tıklama kimliği yalnız istemcide ve mount'tan sonra okunur: sunucu bağlantıyı
// kimliksiz basar, istemci hydration bitince ekler; böylece href için
// hydration uyuşmazlığı çıkmaz.
const clickPart = ref('')
onMounted(() => {
  const click = $afietClickId()
  if (click) clickPart.value = `${click.k}=${encodeURIComponent(click.v)}`
})

const playHref = computed(() => {
  const parts = ['utm_source=afiet.co', 'utm_medium=web', `utm_campaign=${encodeURIComponent(route.path)}`]
  if (clickPart.value) parts.push(clickPart.value)
  // Play, `referrer` değerini olduğu gibi Install Referrer'a koyar; içindeki
  // & ve = karakterleri kaçırılmazsa Play'in kendi sorgusuna karışır.
  return `${MAGAZA.play}&referrer=${encodeURIComponent(parts.join('&'))}`
})

const stores = computed<Store[]>(() => [
  { key: 'appstore', label: 'App Store', href: MAGAZA.appStore, live: MAGAZA.ios, platform: 'iPhone' },
  {
    key: 'play',
    label: 'Google Play',
    href: MAGAZA.android ? playHref.value : MAGAZA.play,
    live: MAGAZA.android,
    platform: 'Android',
  },
])

function onClick(store: Store) {
  $afietEvent('magaza_tik', { p: route.path, v: store.key })
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3" :class="size === 'lg' ? 'justify-center' : ''">
    <component
      :is="store.live ? 'a' : 'span'"
      v-for="store in stores"
      :key="store.key"
      v-bind="store.live ? { href: store.href, target: '_blank', rel: 'noopener' } : {}"
      class="flex items-center gap-2.5 rounded-2xl border border-line bg-surface text-left text-ink"
      :class="[
        size === 'lg' ? 'px-5 py-3' : 'px-4 py-2',
        store.live ? 'transition hover:border-brand/40 hover:text-brand-deep active:scale-[0.98]' : 'opacity-60',
      ]"
      @click="store.live && onClick(store)"
    >
      <svg
        v-if="store.key === 'appstore'"
        viewBox="0 0 24 24"
        class="text-ink"
        :class="size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 7c-4 0-6.5 3-6.5 6.5 0 3 2 6.5 4 6.5 1.2 0 1.6-.7 2.5-.7s1.3.7 2.5.7c2 0 4-3.5 4-6.5C18.5 10 16 7 12 7z" />
        <path d="M12 7c0-2 1.5-3.5 3-4" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        class="text-ink"
        :class="size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 4.5v15l12-7.5z" />
      </svg>
      <span class="leading-tight">
        <span class="block text-[10px] font-bold tracking-wide text-muted uppercase">
          {{ store.live ? store.platform : props.soonLabel }}
        </span>
        <span class="block font-extrabold" :class="size === 'lg' ? 'text-base' : 'text-sm'">
          {{ store.label }}
        </span>
      </span>
    </component>
  </div>
</template>

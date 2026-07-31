<script setup lang="ts">
import { destek } from '~/data/content'
import { trKatla, trKelimeler } from '#shared/utils/turkce'
import type { DestekAramaSatiri } from '#shared/types/destek'

/**
 * Destek merkezinin arama kutusu. Eşleştirme TAMAMEN tarayıcıda yapılır:
 * dizin (`/api/destek/arama`) kutuya İLK odaklanıldığında bir kez indirilir,
 * sonra her tuş vuruşu bellekte çalışır. Dış arama servisi yok, sunucuya
 * tuş başına istek yok, JS kapalıyken de sayfa okunur kalır (kutu yalnız
 * çalışmaz).
 *
 * Türkçe katlama `#shared/utils/turkce` ile yapılır: dizini üreten sunucu ile
 * eşleştiren istemci AYNI fonksiyonu kullanmak zorunda.
 *
 * `yerinde` = bu sayfada Afi paneli var demektir (hub). O zaman boş sonuçtaki
 * çağrı olayı yayar; başka sayfalarda hub'a bağlantı verir.
 */
const props = withDefaults(
  defineProps<{ boyut?: 'buyuk' | 'kucuk'; yerinde?: boolean }>(),
  { boyut: 'buyuk', yerinde: false },
)
const emit = defineEmits<{ afiyeSor: [soru: string] }>()

type Satir = DestekAramaSatiri & { fb: string; fo: string; fa: string; fg: string }

const route = useRoute()
const { $afietOlay } = useNuxtApp()

const sorgu = ref('')
const acik = ref(false)
const secili = ref(-1)
const dizin = ref<Satir[] | null>(null)
const girdiEl = ref<HTMLInputElement | null>(null)
const sarmalayiciEl = ref<HTMLElement | null>(null)

let yukleniyor = false

/** Dizin bir kez indirilir; hata hâlinde boş dizi (arama sessizce çalışmaz). */
async function dizinYukle() {
  if (dizin.value || yukleniyor) return
  yukleniyor = true
  try {
    const yanit = await $fetch<{ satirlar: DestekAramaSatiri[] }>('/api/destek/arama')
    dizin.value = yanit.satirlar.map((s) => ({
      ...s,
      fb: trKatla(s.b),
      fo: trKatla(s.o),
      fa: trKatla(s.a),
      fg: trKatla(s.g),
    }))
  } catch {
    dizin.value = []
  } finally {
    yukleniyor = false
  }
}

/**
 * Skorlama. Kelimelerden BİRİ hiç geçmiyorsa yazı elenir (VE mantığı):
 * "grup daveti" araması "grup" geçen her yazıyı dökmez.
 *
 * Ayrıca yazının, sorgunun EN AZ BİR kelimesini küratörlü bir alanda
 * (başlık, özet, ara başlık, anahtar kelime) taşıması gerekir. Yalnız gövdede
 * geçmek yetmez, çünkü Türkçe'de alt dize eşleşmesi kaçınılmaz gürültü üretir:
 * "grup" araması metninde "besin grubu" geçen her yazıyı yakalardı.
 */
const KURATORLU_ESIK = 8
const sonuclar = computed<Satir[]>(() => {
  const ham = sorgu.value.trim()
  if (ham.length < 2 || !dizin.value) return []
  const tam = trKatla(ham)
  const kelimeler = trKelimeler(ham)
  if (!kelimeler.length) return []

  const bicimler = kelimeler.map(kelimeBicimleri)

  const puanli: { satir: Satir; puan: number }[] = []
  for (const satir of dizin.value) {
    let puan = satir.fb.includes(tam) ? 100 : 0
    let hepsiVar = true
    let enIyiKuratorlu = 0
    for (const secenekler of bicimler) {
      // Bir kelimenin biçimlerinden EN İYİSİ sayılır, hepsi toplanmaz.
      let p = 0
      let kuratorlu = 0
      for (const kelime of secenekler) {
        let k = 0
        if (satir.fb.includes(kelime)) k += satir.fb.startsWith(kelime) ? 30 : 22
        if (satir.fo.includes(kelime)) k += 10
        if (satir.fa.includes(kelime)) k += 8
        const s = k + (satir.fg.includes(kelime) ? 3 : 0)
        if (s > p) {
          p = s
          kuratorlu = k
        }
      }
      if (!p) {
        hepsiVar = false
        break
      }
      if (kuratorlu > enIyiKuratorlu) enIyiKuratorlu = kuratorlu
      puan += p
    }
    if (hepsiVar && enIyiKuratorlu >= KURATORLU_ESIK) puanli.push({ satir, puan })
  }

  return puanli
    .sort((a, b) => b.puan - a.puan || a.satir.b.localeCompare(b.satir.b, 'tr'))
    .slice(0, 8)
    .map((p) => p.satir)
})

const araniyor = computed(() => sorgu.value.trim().length >= 2 && dizin.value === null)
const bosSonuc = computed(
  () => sorgu.value.trim().length >= 2 && dizin.value !== null && sonuclar.value.length === 0,
)
const panelAcik = computed(() => acik.value && sorgu.value.trim().length >= 2)

const yol = (s: Satir) => `/destek/${s.k}/${s.s}`

/**
 * Türkçe ünsüz yumuşaması. Ek alan kelimenin sonundaki sert ünsüz yumuşar:
 * grup → gruba, kanat → kanadı, kayık → kayığı. Ziyaretçi kökü yazar
 * ("grup"), metinde çekimli hâli geçer ("gruba"), ve alt dize eşleşmesi
 * boşa düşer. Kökün yumuşamış hâlini de deneyerek bunu kapatıyoruz.
 *
 * ç ve ğ katlama sırasında zaten c ve g'ye indiği için burada yalnız üç
 * dönüşüm kalır.
 */
const YUMUSAK: Record<string, string> = { p: 'b', t: 'd', k: 'g' }

function kelimeBicimleri(kelime: string): string[] {
  const son = kelime.at(-1) ?? ''
  const yumusak = YUMUSAK[son]
  // Tek heceli çok kısa kelimelerde yumuşama kuralı işlemez (at, ok gibi).
  if (!yumusak || kelime.length < 4) return [kelime]
  return [kelime, kelime.slice(0, -1) + yumusak]
}

// ── Bulunamayan aramayı ölç ──────────────────────────────────────────────────
// Yazarken her ara durumu değil, kullanıcı DURDUKTAN sonraki hâli sayılır.
let olcumZamani: ReturnType<typeof setTimeout> | undefined
watch([sorgu, bosSonuc], () => {
  clearTimeout(olcumZamani)
  if (!bosSonuc.value) return
  const deger = sorgu.value.trim()
  if (deger.length < 3) return
  olcumZamani = setTimeout(() => {
    $afietOlay('destek_arama', { p: route.path, v: deger })
  }, 1400)
})
onBeforeUnmount(() => clearTimeout(olcumZamani))

// ── Klavye ───────────────────────────────────────────────────────────────────
function kapat() {
  acik.value = false
  secili.value = -1
}

async function git(s: Satir) {
  kapat()
  await navigateTo(yol(s))
}

function tusla(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    kapat()
    return
  }
  if (!panelAcik.value) return
  const n = sonuclar.value.length
  if (e.key === 'ArrowDown' && n) {
    e.preventDefault()
    secili.value = (secili.value + 1) % n
  } else if (e.key === 'ArrowUp' && n) {
    e.preventDefault()
    secili.value = secili.value <= 0 ? n - 1 : secili.value - 1
  } else if (e.key === 'Enter') {
    const s = sonuclar.value[secili.value]
    if (s) {
      e.preventDefault()
      void git(s)
    }
  }
}

watch(sorgu, () => {
  secili.value = -1
  if (sorgu.value.trim().length >= 2) acik.value = true
})

/** Eğik çizgi kısayolu: bir metin alanında değilsen kutuya odaklan. */
function kisayol(e: KeyboardEvent) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
  const hedef = e.target as HTMLElement | null
  const etiket = hedef?.tagName?.toLowerCase()
  if (etiket === 'input' || etiket === 'textarea' || hedef?.isContentEditable) return
  e.preventDefault()
  girdiEl.value?.focus()
}

/** Dışarı tıklayınca sonuç listesi kapanır. */
function disariTikla(e: MouseEvent) {
  if (!sarmalayiciEl.value?.contains(e.target as Node)) kapat()
}

onMounted(() => {
  addEventListener('keydown', kisayol)
  addEventListener('click', disariTikla)
})
onBeforeUnmount(() => {
  removeEventListener('keydown', kisayol)
  removeEventListener('click', disariTikla)
})

function afiyeSor() {
  const soru = sorgu.value.trim()
  kapat()
  emit('afiyeSor', soru)
}
</script>

<template>
  <div ref="sarmalayiciEl" class="relative">
    <label class="sr-only" :for="`destek-ara-${props.boyut}`">{{ destek.searchLabel }}</label>
    <div class="relative">
      <svg
        class="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        :id="`destek-ara-${props.boyut}`"
        ref="girdiEl"
        v-model="sorgu"
        type="search"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-controls="destek-sonuclar"
        :aria-expanded="panelAcik"
        :aria-activedescendant="secili >= 0 ? `destek-sonuc-${secili}` : undefined"
        :placeholder="destek.searchPlaceholder"
        class="w-full rounded-full border border-line bg-surface font-semibold text-ink transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
        :class="props.boyut === 'buyuk' ? 'py-4 pr-5 pl-12 text-lg shadow-lift' : 'py-2.5 pr-4 pl-11 text-sm'"
        @focus="dizinYukle"
        @keydown="tusla"
      />
    </div>

    <!-- Sonuç listesi. Kutu boşken hiç render edilmez; sayfanın altındaki
         içeriği kapatmasın diye mutlak konumlu. -->
    <div
      v-if="panelAcik"
      id="destek-sonuclar"
      role="listbox"
      :aria-label="destek.resultsLabel"
      class="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-3xl border border-line bg-surface shadow-float"
    >
      <p v-if="araniyor" class="px-5 py-4 text-sm font-bold text-muted">{{ destek.searching }}</p>

      <ul v-else-if="sonuclar.length" class="max-h-[26rem] overflow-y-auto py-1.5">
        <li v-for="(s, i) in sonuclar" :key="`${s.k}/${s.s}`">
          <NuxtLink
            :id="`destek-sonuc-${i}`"
            role="option"
            :aria-selected="i === secili"
            :to="yol(s)"
            class="block px-5 py-3 transition"
            :class="i === secili ? 'bg-canvas' : 'hover:bg-canvas'"
            @click="kapat"
            @mouseenter="secili = i"
          >
            <span class="block font-extrabold tracking-tight text-ink">{{ s.b }}</span>
            <span v-if="s.o" class="mt-0.5 line-clamp-1 block text-sm text-soft">{{ s.o }}</span>
          </NuxtLink>
        </li>
      </ul>

      <!-- Boş sonuç çıkmaz sokak değildir: buradan Afi devralır. -->
      <div v-else class="px-5 py-5">
        <p class="font-extrabold tracking-tight text-ink">{{ destek.noResultsTitle }}</p>
        <p class="mt-1 text-sm text-soft">{{ destek.noResultsBody }}</p>
        <button
          v-if="props.yerinde"
          type="button"
          class="btn-primary mt-4 !px-5 !py-2.5 text-sm"
          @click="afiyeSor"
        >
          {{ destek.askAfiCta }}
        </button>
        <NuxtLink
          v-else
          :to="{ path: '/destek', query: { soru: sorgu.trim() }, hash: '#afiye-sor' }"
          class="btn-primary mt-4 !px-5 !py-2.5 text-sm"
          @click="kapat"
        >
          {{ destek.askAfiCta }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

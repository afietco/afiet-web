<script setup lang="ts">
import { support } from '~/data/content'
import { trFold, trWords } from '#shared/utils/turkish'
import type { SupportSearchRow } from '#shared/types/support'

/**
 * Destek merkezinin arama kutusu. Eşleştirme TAMAMEN tarayıcıda yapılır:
 * dizin (`/api/destek/arama`) kutuya İLK odaklanıldığında bir kez indirilir,
 * sonra her tuş vuruşu bellekte çalışır. Dış arama servisi yok, sunucuya
 * tuş başına istek yok, JS kapalıyken de sayfa okunur kalır (kutu yalnız
 * çalışmaz).
 *
 * Türkçe katlama `#shared/utils/turkish` ile yapılır: dizini üreten sunucu ile
 * eşleştiren istemci AYNI fonksiyonu kullanmak zorunda.
 *
 * `inPlace` = bu sayfada Afi paneli var demektir (hub). O zaman boş sonuçtaki
 * çağrı olayı yayar; başka sayfalarda hub'a bağlantı verir.
 */
const props = withDefaults(
  defineProps<{ size?: 'large' | 'small'; inPlace?: boolean }>(),
  { size: 'large', inPlace: false },
)
const emit = defineEmits<{ askAfi: [question: string] }>()

type Row = SupportSearchRow & { fb: string; fo: string; fa: string; fg: string }

const route = useRoute()
const { $afietEvent } = useNuxtApp()

const query = ref('')
const open = ref(false)
const selected = ref(-1)
const index = ref<Row[] | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const wrapperEl = ref<HTMLElement | null>(null)

let loading = false

/** Dizin bir kez indirilir; hata hâlinde boş dizi (arama sessizce çalışmaz). */
async function loadIndex() {
  if (index.value || loading) return
  loading = true
  try {
    const response = await $fetch<{ rows: SupportSearchRow[] }>('/api/destek/arama')
    index.value = response.rows.map((row) => ({
      ...row,
      fb: trFold(row.b),
      fo: trFold(row.o),
      fa: trFold(row.a),
      fg: trFold(row.g),
    }))
  } catch {
    index.value = []
  } finally {
    loading = false
  }
}

/**
 * Türkçe ünsüz yumuşaması. Ek alan kelimenin sonundaki sert ünsüz yumuşar:
 * grup → gruba, kanat → kanadı, kayık → kayığı. Ziyaretçi kökü yazar
 * ("grup"), metinde çekimli hâli geçer ("gruba"), ve alt dize eşleşmesi
 * boşa düşer. Kökün yumuşamış hâlini de deneyerek bunu kapatıyoruz.
 *
 * ç ve ğ katlama sırasında zaten c ve g'ye indiği için burada yalnız üç
 * dönüşüm kalır.
 */
const SOFTENED: Record<string, string> = { p: 'b', t: 'd', k: 'g' }

function wordForms(word: string): string[] {
  const last = word.at(-1) ?? ''
  const soft = SOFTENED[last]
  // Tek heceli çok kısa kelimelerde yumuşama kuralı işlemez (at, ok gibi).
  if (!soft || word.length < 4) return [word]
  return [word, word.slice(0, -1) + soft]
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
const CURATED_THRESHOLD = 8

const results = computed<Row[]>(() => {
  const raw = query.value.trim()
  if (raw.length < 2 || !index.value) return []
  const whole = trFold(raw)
  const words = trWords(raw)
  if (!words.length) return []

  const forms = words.map(wordForms)

  const scored: { row: Row; score: number }[] = []
  for (const row of index.value) {
    let score = row.fb.includes(whole) ? 100 : 0
    let allPresent = true
    let bestCurated = 0
    for (const options of forms) {
      // Bir kelimenin biçimlerinden EN İYİSİ sayılır, hepsi toplanmaz.
      let best = 0
      let curated = 0
      for (const word of options) {
        let c = 0
        if (row.fb.includes(word)) c += row.fb.startsWith(word) ? 30 : 22
        if (row.fo.includes(word)) c += 10
        if (row.fa.includes(word)) c += 8
        const total = c + (row.fg.includes(word) ? 3 : 0)
        if (total > best) {
          best = total
          curated = c
        }
      }
      if (!best) {
        allPresent = false
        break
      }
      if (curated > bestCurated) bestCurated = curated
      score += best
    }
    if (allPresent && bestCurated >= CURATED_THRESHOLD) scored.push({ row, score })
  }

  return scored
    .sort((a, b) => b.score - a.score || a.row.b.localeCompare(b.row.b, 'tr'))
    .slice(0, 8)
    .map((s) => s.row)
})

const searching = computed(() => query.value.trim().length >= 2 && index.value === null)
const noResults = computed(
  () => query.value.trim().length >= 2 && index.value !== null && results.value.length === 0,
)
const panelOpen = computed(() => open.value && query.value.trim().length >= 2)

const pathOf = (row: Row) => `/destek/${row.k}/${row.s}`

// ── Bulunamayan aramayı ölç ──────────────────────────────────────────────────
// Yazarken her ara durumu değil, kullanıcı DURDUKTAN sonraki hâli sayılır.
let measureTimer: ReturnType<typeof setTimeout> | undefined
watch([query, noResults], () => {
  clearTimeout(measureTimer)
  if (!noResults.value) return
  const value = query.value.trim()
  if (value.length < 3) return
  measureTimer = setTimeout(() => {
    $afietEvent('destek_arama', { p: route.path, v: value })
  }, 1400)
})
onBeforeUnmount(() => clearTimeout(measureTimer))

// ── Klavye ───────────────────────────────────────────────────────────────────
function close() {
  open.value = false
  selected.value = -1
}

async function go(row: Row) {
  close()
  await navigateTo(pathOf(row))
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close()
    return
  }
  if (!panelOpen.value) return
  const n = results.value.length
  if (e.key === 'ArrowDown' && n) {
    e.preventDefault()
    selected.value = (selected.value + 1) % n
  } else if (e.key === 'ArrowUp' && n) {
    e.preventDefault()
    selected.value = selected.value <= 0 ? n - 1 : selected.value - 1
  } else if (e.key === 'Enter') {
    const row = results.value[selected.value]
    if (row) {
      e.preventDefault()
      void go(row)
    }
  }
}

watch(query, () => {
  selected.value = -1
  if (query.value.trim().length >= 2) open.value = true
})

/** Eğik çizgi kısayolu: bir metin alanında değilsen kutuya odaklan. */
function onShortcut(e: KeyboardEvent) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
  const target = e.target as HTMLElement | null
  const tag = target?.tagName?.toLowerCase()
  if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
  e.preventDefault()
  inputEl.value?.focus()
}

/** Dışarı tıklayınca sonuç listesi kapanır. */
function onOutsideClick(e: MouseEvent) {
  if (!wrapperEl.value?.contains(e.target as Node)) close()
}

onMounted(() => {
  addEventListener('keydown', onShortcut)
  addEventListener('click', onOutsideClick)
})
onBeforeUnmount(() => {
  removeEventListener('keydown', onShortcut)
  removeEventListener('click', onOutsideClick)
})

function askAfi() {
  const question = query.value.trim()
  close()
  emit('askAfi', question)
}
</script>

<template>
  <div ref="wrapperEl" class="relative">
    <label class="sr-only" :for="`destek-ara-${props.size}`">{{ support.searchLabel }}</label>
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
        :id="`destek-ara-${props.size}`"
        ref="inputEl"
        v-model="query"
        type="search"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        aria-controls="destek-sonuclar"
        :aria-expanded="panelOpen"
        :aria-activedescendant="selected >= 0 ? `destek-sonuc-${selected}` : undefined"
        :placeholder="support.searchPlaceholder"
        class="w-full rounded-full border border-line bg-surface font-semibold text-ink transition placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
        :class="
          props.size === 'large'
            ? 'py-4 pr-5 pl-12 text-lg shadow-lift'
            : 'py-2.5 pr-4 pl-11 text-sm'
        "
        @focus="loadIndex"
        @keydown="onKeydown"
      />
    </div>

    <!-- Sonuç listesi. Kutu boşken hiç render edilmez; sayfanın altındaki
         içeriği kapatmasın diye mutlak konumlu. -->
    <div
      v-if="panelOpen"
      id="destek-sonuclar"
      role="listbox"
      :aria-label="support.resultsLabel"
      class="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-3xl border border-line bg-surface shadow-float"
    >
      <p v-if="searching" class="px-5 py-4 text-sm font-bold text-muted">
        {{ support.searching }}
      </p>

      <ul v-else-if="results.length" class="max-h-[26rem] overflow-y-auto py-1.5">
        <li v-for="(row, i) in results" :key="`${row.k}/${row.s}`">
          <NuxtLink
            :id="`destek-sonuc-${i}`"
            role="option"
            :aria-selected="i === selected"
            :to="pathOf(row)"
            class="block px-5 py-3 transition"
            :class="i === selected ? 'bg-canvas' : 'hover:bg-canvas'"
            @click="close"
            @mouseenter="selected = i"
          >
            <span class="block font-extrabold tracking-tight text-ink">{{ row.b }}</span>
            <span v-if="row.o" class="mt-0.5 line-clamp-1 block text-sm text-soft">
              {{ row.o }}
            </span>
          </NuxtLink>
        </li>
      </ul>

      <!-- Boş sonuç çıkmaz sokak değildir: buradan Afi devralır. -->
      <div v-else class="px-5 py-5">
        <p class="font-extrabold tracking-tight text-ink">{{ support.noResultsTitle }}</p>
        <p class="mt-1 text-sm text-soft">{{ support.noResultsBody }}</p>
        <button
          v-if="props.inPlace"
          type="button"
          class="btn-primary mt-4 !px-5 !py-2.5 text-sm"
          @click="askAfi"
        >
          {{ support.askAfiCta }}
        </button>
        <NuxtLink
          v-else
          :to="{ path: '/destek', query: { soru: query.trim() }, hash: '#afiye-sor' }"
          class="btn-primary mt-4 !px-5 !py-2.5 text-sm"
          @click="close"
        >
          {{ support.askAfiCta }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

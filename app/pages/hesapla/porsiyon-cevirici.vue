<script setup lang="ts">
import { hesapla } from '~/data/content'
import { BESIN_GRUBU, OLCU_ETIKET, grupEtiket } from '#shared/hesap/tipler'
import { trFold, trWords } from '#shared/utils/turkish'

/**
 * Porsiyon çevirici: bir besnin kendi ölçüsünü, gram karşılığını ve hangi
 * besin gruplarına sayıldığını gösterir.
 *
 * Katalog `public/veri/besinler.json` (2007 besin, ~74 KB gzip) ve
 * `scripts/besin-index-uret.mjs` ile mobil çekirdekten üretilir. Sayfa
 * açılışında İNMEZ: kutuya ilk yazıldığında bir kez indirilir, destek
 * merkezindeki arama diziniyle aynı yaklaşım.
 *
 * Kalori ve makro yine katlanmış durur (hedeflerim.md § 12).
 */
usePageSeo()
const c = hesapla.portion
const icerik = useHesapIcerik(c.slug)

type Besin = {
  a: string; e: string; o: string; g: number | null; gr: string[]
  m: number; k: string; d: string[]; mk: [number, number, number, number] | null; l: number; t: string[]
}
type Satir = Besin & { f: string; ft: string }

const sorgu = ref('')
const katalog = ref<Satir[] | null>(null)
const yukleniyor = ref(false)
const secili = ref<Satir | null>(null)
const miktar = ref(1)

async function katalogYukle() {
  if (katalog.value || yukleniyor.value) return
  yukleniyor.value = true
  try {
    const y = await $fetch<{ besinler: Besin[] }>('/veri/besinler.json')
    katalog.value = y.besinler.map((b) => ({ ...b, f: trFold(b.a), ft: trFold(b.t.join(' ')) }))
  } catch {
    katalog.value = []
  } finally {
    yukleniyor.value = false
  }
}

/**
 * Ad üzerinde eşleşme; takma adlar ikinci sırada. Destek aramasındaki
 * skorlamanın sadeleştirilmiş hâli: burada kelime sayısı az ve alan tek.
 */
const sonuclar = computed<Satir[]>(() => {
  const ham = sorgu.value.trim()
  if (ham.length < 2 || !katalog.value) return []
  const tam = trFold(ham)
  const kelimeler = trWords(ham)
  if (!kelimeler.length) return []

  const puanli: { s: Satir; p: number }[] = []
  for (const s of katalog.value) {
    let puan = 0
    if (s.f === tam) puan += 200
    else if (s.f.startsWith(tam)) puan += 120
    else if (s.f.includes(tam)) puan += 60
    let hepsi = true
    for (const k of kelimeler) {
      const adda = s.f.includes(k)
      const takma = s.ft.includes(k)
      if (!adda && !takma) { hepsi = false; break }
      puan += adda ? 12 : 5
    }
    if (hepsi && puan) puanli.push({ s, p: puan })
  }
  return puanli
    .sort((x, y) => y.p - x.p || x.s.a.localeCompare(y.s.a, 'tr'))
    .slice(0, 12)
    .map((x) => x.s)
})

function sec(b: Satir) {
  secili.value = b
  miktar.value = b.m || 1
  sorgu.value = ''
}

const ADIM = 0.5
const artir = () => { miktar.value = Math.min(20, Math.round((miktar.value + ADIM) * 2) / 2) }
const azalt = () => { miktar.value = Math.max(ADIM, Math.round((miktar.value - ADIM) * 2) / 2) }

const bir = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(n)
const tam0 = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n)

const olcuAdi = computed(() => (secili.value ? (OLCU_ETIKET[secili.value.o] ?? secili.value.o) : ''))
const gramToplam = computed(() =>
  secili.value?.g ? secili.value.g * miktar.value : null,
)
const makro = computed(() => {
  const s = secili.value
  if (!s?.mk) return null
  const [kcal, p, k, y] = s.mk
  return { kcal: kcal * miktar.value, p: p * miktar.value, k: k * miktar.value, y: y * miktar.value, lif: s.l * miktar.value }
})
const temelMi = (key: string) => BESIN_GRUBU.find((g) => g.key === key)?.temel ?? false
</script>

<template>
  <div class="mx-auto max-w-3xl px-5 py-12 sm:py-16">
    <nav aria-label="Kırıntı yolu" class="text-sm font-bold text-muted">
      <NuxtLink to="/hesapla" class="transition hover:text-brand-deep">Hesapla</NuxtLink>
      <span class="mx-1.5" aria-hidden="true">›</span>
      <span class="text-soft">{{ c.eyebrow }}</span>
    </nav>

    <header class="mt-4">
      <h1 class="font-display text-4xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
        {{ c.title }}
      </h1>
      <p class="mt-4 text-[17px] leading-relaxed text-soft">{{ c.sub }}</p>
    </header>

    <div class="relative mt-8">
      <label class="sr-only" for="besin-ara">{{ c.searchLabel }}</label>
      <svg
        class="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
      <input
        id="besin-ara"
        v-model="sorgu"
        type="search"
        autocomplete="off"
        :placeholder="c.searchPlaceholder"
        class="w-full rounded-full border border-line bg-surface py-4 pr-5 pl-12 text-lg font-semibold text-ink shadow-lift transition placeholder:font-normal placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
        @focus="katalogYukle"
        @input="katalogYukle"
      />

      <div
        v-if="sorgu.trim().length >= 2"
        class="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-3xl border border-line bg-surface shadow-float"
      >
        <p v-if="katalog === null" class="px-5 py-4 text-sm font-bold text-muted">
          {{ c.loading }}
        </p>
        <ul v-else-if="sonuclar.length" class="max-h-[24rem] overflow-y-auto py-1.5">
          <li v-for="b in sonuclar" :key="b.a">
            <button
              type="button"
              class="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-canvas"
              @click="sec(b)"
            >
              <span class="text-xl" aria-hidden="true">{{ b.e || '🍽️' }}</span>
              <span class="font-extrabold tracking-tight text-ink">{{ b.a }}</span>
              <span class="ml-auto text-sm font-bold text-muted">
                {{ OLCU_ETIKET[b.o] ?? b.o }}
              </span>
            </button>
          </li>
        </ul>
        <p v-else class="px-5 py-4 text-sm text-soft">{{ c.noResults }}</p>
      </div>
    </div>

    <p v-if="!secili" class="mt-3 text-sm text-muted">{{ c.hint }}</p>

    <!-- Seçilen besin -->
    <section v-if="secili" class="mt-10" aria-live="polite">
      <div class="rounded-3xl border border-line bg-surface p-6 sm:p-7">
        <div class="flex items-center gap-3">
          <span class="text-3xl" aria-hidden="true">{{ secili.e || '🍽️' }}</span>
          <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
            {{ secili.a }}
          </h2>
        </div>

        <div class="mt-6">
          <p class="text-sm font-extrabold text-soft">{{ c.quantityLabel }}</p>
          <div class="mt-2 flex items-center gap-3">
            <button
              type="button"
              class="grid h-11 w-11 place-items-center rounded-full border border-line bg-canvas text-2xl font-extrabold text-ink transition hover:border-brand/40"
              aria-label="Azalt"
              @click="azalt"
            >
              &minus;
            </button>
            <span class="min-w-[9rem] text-center font-display text-3xl font-semibold text-ink">
              {{ bir(miktar) }} {{ olcuAdi }}
            </span>
            <button
              type="button"
              class="grid h-11 w-11 place-items-center rounded-full border border-line bg-canvas text-2xl font-extrabold text-ink transition hover:border-brand/40"
              aria-label="Artır"
              @click="artir"
            >
              +
            </button>
          </div>
          <p v-if="gramToplam" class="mt-3 text-soft">
            {{ c.gramLabel }} <span class="font-extrabold text-ink">{{ tam0(gramToplam) }} g</span>
          </p>
        </div>

        <div class="mt-6">
          <p class="text-sm font-extrabold text-soft">{{ c.groupsTitle }}</p>
          <p class="mt-2 flex flex-wrap gap-2">
            <span
              v-for="g in secili.gr"
              :key="g"
              class="rounded-full px-3 py-1.5 text-sm"
              :class="
                temelMi(g)
                  ? 'bg-brand-mint/50 font-extrabold text-brand-ink'
                  : 'bg-canvas font-bold text-soft'
              "
            >
              {{ grupEtiket(g) }}
            </span>
          </p>
          <p class="mt-2 text-sm text-muted">{{ c.coreNote }}</p>
        </div>
      </div>

      <details v-if="makro" class="hesap-sayilar mt-4 rounded-2xl border border-line bg-surface">
        <summary
          class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-extrabold tracking-tight text-ink [&::-webkit-details-marker]:hidden"
        >
          <span>{{ c.numbersToggle }}</span>
          <span class="hesap-ok text-brand transition duration-300" aria-hidden="true">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
              <path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </summary>
        <div class="border-t border-line px-5 py-4">
          <dl class="flex flex-col gap-2.5">
            <div class="flex items-baseline justify-between gap-4">
              <dt class="font-bold text-soft">{{ c.kcalLabel }}</dt>
              <dd class="font-extrabold text-ink">{{ tam0(makro.kcal) }} kcal</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="font-bold text-soft">{{ c.proteinLabel }}</dt>
              <dd class="font-extrabold text-ink">{{ bir(makro.p) }} g</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="font-bold text-soft">{{ c.carbLabel }}</dt>
              <dd class="font-extrabold text-ink">{{ bir(makro.k) }} g</dd>
            </div>
            <div class="flex items-baseline justify-between gap-4">
              <dt class="font-bold text-soft">{{ c.fatLabel }}</dt>
              <dd class="font-extrabold text-ink">{{ bir(makro.y) }} g</dd>
            </div>
            <div v-if="makro.lif" class="flex items-baseline justify-between gap-4">
              <dt class="font-bold text-soft">{{ c.fiberLabel }}</dt>
              <dd class="font-extrabold text-ink">{{ bir(makro.lif) }} g</dd>
            </div>
          </dl>
          <p class="mt-4 text-sm leading-relaxed text-muted">{{ c.numbersNote }}</p>
        </div>
      </details>

      <p class="mt-5 leading-relaxed text-soft">{{ c.context }}</p>

      <div class="mt-8 rounded-3xl border border-brand/30 bg-brand-mint/20 p-7">
        <h2 class="font-display text-xl font-semibold tracking-tight text-ink">{{ c.nextTitle }}</h2>
        <p class="mt-2 leading-relaxed text-soft">{{ c.nextBody }}</p>
        <NuxtLink to="/indir" class="btn-primary mt-5">{{ c.nextCta }}</NuxtLink>
      </div>
    </section>

    <HesapIcerik v-if="icerik" :icerik="icerik" />


    <HesapAltBilgi :sonuc-var="Boolean(secili)" />
  </div>
</template>

<style scoped>
.hesap-sayilar[open] .hesap-ok {
  transform: rotate(180deg);
}
</style>

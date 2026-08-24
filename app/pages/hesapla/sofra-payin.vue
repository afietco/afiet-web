<script setup lang="ts">
import { hesapla } from '~/data/content'
import { calculateGoals } from '#shared/hesap/motor'
import { fiberGrams, waterGlassesFromTdee } from '#shared/hesap/vucut'
import { ACTIVITY_LEVELS, SEXES, type ActivityLevel, type Sex } from '#shared/hesap/tipler'
import { makulMu, sayiyaCevir } from '#shared/hesap/girdi'

/**
 * "Sofra payın": vücut bilgisinden günlük EL ÖLÇÜSÜ üretir.
 *
 * Doktrin (afiet-hedefler docs/hedeflerim.md, bağlayıcı):
 * - Yön SORULMAZ; site herkese `duzen` (sürdürme) tablosunu gösterir. Açık
 *   üreten bir yönü tanımadığımız bir ziyaretçiye vermeyiz.
 * - Sağlık beyanı SORULMAZ; hassas veri istemeyiz, yerine sakin bir uyarı.
 * - 18 yaş altında motor hedef üretmez (§ 9 minor rayı) ve ekran denge diline döner.
 * - Kalori ve gram katlanmış durur (§ 12: birincil dil yapma).
 *
 * Hesap TAMAMEN tarayıcıda çalışır: hiçbir değer sunucuya gitmez. Sayfanın
 * gizlilik cümlesi buna dayanır, bozma.
 */
usePageSeo()

const c = hesapla.plate
const icerik = useHesapIcerik(c.slug)

const sex = ref<Sex>('kadin')
const age = ref('')
const height = ref('')
const weight = ref('')
const activity = ref<ActivityLevel>('orta')
const error = ref('')
const result = ref<ReturnType<typeof calculateGoals> | null>(null)
const resultEl = ref<HTMLElement | null>(null)

function hesaplaTabak() {
  error.value = ''
  const a = sayiyaCevir(age.value)
  const h = sayiyaCevir(height.value)
  const w = sayiyaCevir(weight.value)

  if (a === null || h === null || w === null) {
    error.value = hesapla.errorMissing
    result.value = null
    return
  }
  if (!makulMu('yas', a) || !makulMu('boy', h) || !makulMu('kilo', w)) {
    error.value = hesapla.errorRange
    result.value = null
    return
  }

  result.value = calculateGoals({
    sex: sex.value,
    ageYears: Math.round(a),
    heightCm: h,
    weightKg: w,
    activityLevel: activity.value,
    // Yön bilinçli olarak sabit: site açık üretmez.
    direction: 'duzen',
  })

  void nextTick(() => {
    resultEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

/** Sürdürme enerjisinin orta noktası; su ve lif bundan türer. */
const bakimOrta = computed(() => {
  const m = result.value?.maintenance
  return m ? (m.range.min + m.range.max) / 2 : null
})

const suBardak = computed(() =>
  bakimOrta.value === null ? null : waterGlassesFromTdee(bakimOrta.value),
)
const lifGram = computed(() =>
  bakimOrta.value === null ? null : Math.round(fiberGrams(bakimOrta.value)),
)

/** El ölçüsü satırlarının renkleri; sınıflar düz metin olmak zorunda. */
const HAND_STYLE: Record<string, { renk: string; zemin: string; ad: string }> = {
  protein: { renk: 'text-protein', zemin: 'bg-protein', ad: 'protein' },
  vegetable: { renk: 'text-sebze', zemin: 'bg-sebze', ad: 'sebze' },
  grain: { renk: 'text-tahil', zemin: 'bg-tahil', ad: 'tahıl' },
  fat: { renk: 'text-meyve', zemin: 'bg-meyve', ad: 'yağ' },
}

const tam = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n)
const aralik = (min: number, max: number) => `${tam(min)}-${tam(max)}`
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

    <!-- Form. Sunucuya gitmez: submit yalnız yerelde hesaplar. -->
    <form class="mt-9 rounded-3xl border border-line bg-surface p-6 sm:p-7" @submit.prevent="hesaplaTabak">
      <h2 class="font-display text-xl font-semibold tracking-tight text-ink">{{ c.formTitle }}</h2>

      <HesapSecim v-model="sex" :label="c.sexLabel" :secenekler="SEXES" class="mt-5" />

      <div class="mt-5 grid gap-4 sm:grid-cols-3">
        <HesapAlan v-model="age" :label="c.ageLabel" ornek="34" />
        <HesapAlan v-model="height" :label="c.heightLabel" birim="cm" ornek="172" />
        <HesapAlan v-model="weight" :label="c.weightLabel" birim="kg" ornek="74" />
      </div>

      <fieldset class="mt-5">
        <legend class="text-sm font-extrabold text-soft">{{ c.activityLabel }}</legend>
        <div class="mt-2 flex flex-col gap-2">
          <label
            v-for="a in ACTIVITY_LEVELS"
            :key="a.key"
            class="flex cursor-pointer items-baseline gap-3 rounded-2xl border px-4 py-3 transition"
            :class="
              activity === a.key
                ? 'border-brand bg-brand-mint/25'
                : 'border-line bg-canvas hover:border-brand/40'
            "
          >
            <input v-model="activity" type="radio" :value="a.key" class="sr-only" />
            <span class="font-extrabold text-ink">{{ a.label }}</span>
            <span class="text-sm text-soft">{{ a.description }}</span>
          </label>
        </div>
      </fieldset>

      <p v-if="error" class="mt-4 font-bold text-meyve" role="alert">{{ error }}</p>

      <button type="submit" class="btn-primary mt-6 w-full sm:w-auto">
        {{ result ? c.recalc : c.submit }}
      </button>
    </form>

    <!-- Sonuç -->
    <section v-if="result" ref="resultEl" class="mt-10 scroll-mt-24" aria-live="polite">
      <!-- 18 yaş altı: hedef yok, denge dili -->
      <div v-if="result.targetsWithheld" class="rounded-3xl border border-line bg-surface p-7">
        <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
          {{ c.minorTitle }}
        </h2>
        <p class="mt-3 leading-relaxed text-soft">{{ c.minorBody }}</p>
        <p v-for="not in result.notes" :key="not" class="mt-3 text-sm leading-relaxed text-muted">
          {{ not }}
        </p>
      </div>

      <template v-else>
        <h2 class="font-display text-3xl font-semibold tracking-tight text-ink">
          {{ c.resultTitle }}
        </h2>

        <ul class="mt-5 flex flex-col gap-2.5">
          <HesapSatir
            v-for="el in result.hand ?? []"
            :key="el.key"
            :deger="el.text"
            :etiket="HAND_STYLE[el.key]?.ad ?? ''"
            :zemin="HAND_STYLE[el.key]?.zemin ?? 'bg-muted'"
            :renk="HAND_STYLE[el.key]?.renk ?? 'text-soft'"
          />
          <HesapSatir
            v-if="suBardak"
            :deger="`${suBardak} bardak`"
            :etiket="c.waterLabel"
            zemin="bg-sut"
            renk="text-sut"
          />
        </ul>

        <p class="mt-4 text-sm leading-relaxed text-soft">{{ c.handNote }}</p>

        <!-- § 12: kalori ve gram birincil dil değildir. Katlanmış durur. -->
        <details class="hesap-sayilar mt-6 rounded-2xl border border-line bg-surface">
          <summary
            class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-extrabold tracking-tight text-ink [&::-webkit-details-marker]:hidden"
          >
            <span>{{ c.numbersToggle }}</span>
            <span class="hesap-ok text-brand transition duration-300" aria-hidden="true">
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </summary>
          <div class="border-t border-line px-5 py-4">
            <dl class="flex flex-col gap-2.5">
              <div v-if="result.target" class="flex items-baseline justify-between gap-4">
                <dt class="font-bold text-soft">{{ c.kcalLabel }}</dt>
                <dd class="font-extrabold text-ink">
                  {{ aralik(result.target.range.min, result.target.range.max) }} kcal
                </dd>
              </div>
              <div v-if="result.basal" class="flex items-baseline justify-between gap-4">
                <dt class="font-bold text-soft">{{ c.basalLabel }}</dt>
                <dd class="font-extrabold text-ink">{{ tam(result.basal.kcal) }} kcal</dd>
              </div>
              <template v-if="result.macros">
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="font-bold text-soft">{{ c.proteinLabel }}</dt>
                  <dd class="font-extrabold text-ink">
                    {{ aralik(result.macros.protein.min, result.macros.protein.max) }} g
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="font-bold text-soft">{{ c.carbLabel }}</dt>
                  <dd class="font-extrabold text-ink">
                    {{ aralik(result.macros.carb.min, result.macros.carb.max) }} g
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="font-bold text-soft">{{ c.fatLabel }}</dt>
                  <dd class="font-extrabold text-ink">
                    {{ aralik(result.macros.fat.min, result.macros.fat.max) }} g
                  </dd>
                </div>
              </template>
              <div v-if="lifGram" class="flex items-baseline justify-between gap-4">
                <dt class="font-bold text-soft">{{ c.fiberLabel }}</dt>
                <dd class="font-extrabold text-ink">{{ tam(lifGram) }} g</dd>
              </div>
            </dl>
            <p class="mt-4 text-sm leading-relaxed text-muted">{{ c.numbersNote }}</p>
          </div>
        </details>

        <p
          v-for="not in result.notes"
          :key="not"
          class="mt-3 text-sm leading-relaxed text-muted"
        >
          {{ not }}
        </p>

        <div class="mt-8 rounded-3xl border border-brand/30 bg-brand-mint/20 p-7">
          <h3 class="font-display text-xl font-semibold tracking-tight text-ink">
            {{ c.ctaTitle }}
          </h3>
          <p class="mt-2 leading-relaxed text-soft">{{ c.ctaBody }}</p>
          <NuxtLink to="/indir" class="btn-primary mt-5">{{ c.ctaButton }}</NuxtLink>
        </div>
      </template>

    </section>

    <HesapIcerik v-if="icerik" :icerik="icerik" />


    <HesapAltBilgi :sonuc-var="Boolean(result)" />
  </div>
</template>

<style scoped>
.hesap-sayilar[open] .hesap-ok {
  transform: rotate(180deg);
}
</style>

<script setup lang="ts">
import { toolsEn } from '~/data/content.en'
import { calculateGoals, formatHandCount } from '#shared/hesap/motor'
import { fiberGrams, waterGlassesFromTdee } from '#shared/hesap/vucut'
import { ACTIVITY_LEVELS, SEXES, type ActivityLevel, type Sex } from '#shared/hesap/tipler'
import { makulMu } from '#shared/hesap/girdi'

/**
 * "Daily portions", İngilizce (/en/tools/daily-portions-calculator).
 * TR karşılığı /hesapla/sofra-payin.
 *
 * Doktrin (afiet-hedefler docs/hedeflerim.md, İngilizce'de de bağlayıcı):
 * - Yön SORULMAZ; herkese `duzen` (sürdürme) tablosu gösterilir.
 * - Sağlık beyanı sorulmaz; hassas veri istemeyiz.
 * - 18 yaş altında motor hedef üretmez ve ekran denge diline döner.
 * - Kalori ve gram katlanmış durur (§ 12: birincil dil yapma).
 *
 * El ölçüsü metni motorun Türkçe `text` alanından DEĞİL, `count` + `key`den
 * kurulur (content.en.ts > handTerms): motor @afiet/core aynasıdır, ona
 * İngilizce sızmaz. Sayı ve yuvarlama iki dilde birebir aynıdır.
 *
 * Hesap TAMAMEN tarayıcıda çalışır; hiçbir değer sunucuya gitmez.
 */
usePageSeo()

const c = toolsEn.plate
const icerik = useHesapIcerik(c.slug)
const { imperial } = useUnitSystem()

const sex = ref<Sex>('kadin')
const age = ref<number | null>(null)
const heightCm = ref<number | null>(null)
const weightKg = ref<number | null>(null)
const activity = ref<ActivityLevel>('orta')
const error = ref('')
const result = ref<ReturnType<typeof calculateGoals> | null>(null)
const resultEl = ref<HTMLElement | null>(null)

function calculate() {
  error.value = ''
  const a = age.value
  const h = heightCm.value
  const w = weightKg.value

  if (a === null || h === null || w === null) {
    error.value = toolsEn.errorMissing
    result.value = null
    return
  }
  if (!makulMu('yas', a) || !makulMu('boy', h) || !makulMu('kilo', w)) {
    error.value = toolsEn.errorRange
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

  void nextTick(() => resultEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

/** Sürdürme enerjisinin orta noktası; su ve lif bundan türer. */
const maintenanceMid = computed(() => {
  const m = result.value?.maintenance
  return m ? (m.range.min + m.range.max) / 2 : null
})

const glasses = computed(() =>
  maintenanceMid.value === null ? null : waterGlassesFromTdee(maintenanceMid.value),
)
const fiber = computed(() =>
  maintenanceMid.value === null ? null : Math.round(fiberGrams(maintenanceMid.value)),
)

/** El ölçüsü satırlarının renkleri; sınıflar düz metin olmak zorunda. */
const HAND_STYLE: Record<string, { text: string; bg: string }> = {
  protein: { text: 'text-protein', bg: 'bg-protein' },
  vegetable: { text: 'text-sebze', bg: 'bg-sebze' },
  grain: { text: 'text-tahil', bg: 'bg-tahil' },
  fat: { text: 'text-meyve', bg: 'bg-meyve' },
}

/**
 * "3-4 palms" / "1 palm". Sayı motorun aralık yuvarlamasından gelir
 * (ondalık ASLA gösterilmez, § 12); çoğul yalnız tekil olmayan sayıda.
 */
function handText(key: string, count: { min: number; max: number }): string {
  const terms = toolsEn.handTerms[key]
  if (!terms) return formatHandCount(count)
  const single = count.min === count.max && count.min === 1
  return `${formatHandCount(count)} ${single ? terms.term : terms.termPlural}`
}

const zero = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
const span = (min: number, max: number) => `${zero(min)}-${zero(max)}`
</script>

<template>
  <div class="mx-auto max-w-3xl px-5 py-12 sm:py-16">
    <nav aria-label="Breadcrumb" class="text-sm font-bold text-muted">
      <NuxtLink to="/en/tools" class="transition hover:text-brand-deep">
        {{ toolsEn.breadcrumbRoot }}
      </NuxtLink>
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
    <form class="mt-9 rounded-3xl border border-line bg-surface p-6 sm:p-7" @submit.prevent="calculate">
      <h2 class="font-display text-xl font-semibold tracking-tight text-ink">{{ c.formTitle }}</h2>

      <div class="mt-5 flex flex-wrap items-start justify-between gap-5">
        <HesapSecim
          v-model="sex"
          :label="c.sexLabel"
          :secenekler="SEXES.map((s) => ({ key: s.key, label: toolsEn.sexLabels[s.key] ?? s.label }))"
        />
        <ToolUnitToggle />
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-3">
        <ToolField v-model="age" :label="c.ageLabel" kind="plain" :imperial="imperial" :ornek="34" />
        <ToolField
          v-model="heightCm"
          :label="c.heightLabel"
          kind="height"
          :imperial="imperial"
          :ornek="172"
        />
        <ToolField
          v-model="weightKg"
          :label="c.weightLabel"
          kind="weight"
          :imperial="imperial"
          :ornek="74"
        />
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
            <span class="font-extrabold text-ink">
              {{ toolsEn.activityLabels[a.key]?.label ?? a.label }}
            </span>
            <span class="text-sm text-soft">
              {{ toolsEn.activityLabels[a.key]?.description ?? a.description }}
            </span>
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
      <!-- 18 yaş altı: hedef yok, denge dili. Motorun notu Türkçedir, İngilizce
           karşılığı content.en.ts'ten basılır. -->
      <div v-if="result.targetsWithheld" class="rounded-3xl border border-line bg-surface p-7">
        <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
          {{ c.minorTitle }}
        </h2>
        <p class="mt-3 leading-relaxed text-soft">{{ c.minorBody }}</p>
        <p class="mt-3 text-sm leading-relaxed text-muted">{{ toolsEn.minorNote }}</p>
      </div>

      <template v-else>
        <h2 class="font-display text-3xl font-semibold tracking-tight text-ink">
          {{ c.resultTitle }}
        </h2>

        <ul class="mt-5 flex flex-col gap-2.5">
          <HesapSatir
            v-for="hand in result.hand ?? []"
            :key="hand.key"
            :deger="handText(hand.key, hand.count)"
            :etiket="toolsEn.handTerms[hand.key]?.group ?? ''"
            :zemin="HAND_STYLE[hand.key]?.bg ?? 'bg-muted'"
            :renk="HAND_STYLE[hand.key]?.text ?? 'text-soft'"
          />
          <HesapSatir
            v-if="glasses"
            :deger="`${glasses} ${c.glassWord}`"
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
                  {{ span(result.target.range.min, result.target.range.max) }} kcal
                </dd>
              </div>
              <div v-if="result.basal" class="flex items-baseline justify-between gap-4">
                <dt class="font-bold text-soft">{{ c.basalLabel }}</dt>
                <dd class="font-extrabold text-ink">{{ zero(result.basal.kcal) }} kcal</dd>
              </div>
              <template v-if="result.macros">
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="font-bold text-soft">{{ c.proteinLabel }}</dt>
                  <dd class="font-extrabold text-ink">
                    {{ span(result.macros.protein.min, result.macros.protein.max) }} g
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="font-bold text-soft">{{ c.carbLabel }}</dt>
                  <dd class="font-extrabold text-ink">
                    {{ span(result.macros.carb.min, result.macros.carb.max) }} g
                  </dd>
                </div>
                <div class="flex items-baseline justify-between gap-4">
                  <dt class="font-bold text-soft">{{ c.fatLabel }}</dt>
                  <dd class="font-extrabold text-ink">
                    {{ span(result.macros.fat.min, result.macros.fat.max) }} g
                  </dd>
                </div>
              </template>
              <div v-if="fiber" class="flex items-baseline justify-between gap-4">
                <dt class="font-bold text-soft">{{ c.fiberLabel }}</dt>
                <dd class="font-extrabold text-ink">{{ zero(fiber) }} g</dd>
              </div>
            </dl>
            <p class="mt-4 text-sm leading-relaxed text-muted">{{ c.numbersNote }}</p>
          </div>
        </details>

        <div class="mt-8 rounded-3xl border border-brand/30 bg-brand-mint/20 p-7">
          <h3 class="font-display text-xl font-semibold tracking-tight text-ink">
            {{ c.ctaTitle }}
          </h3>
          <p class="mt-2 leading-relaxed text-soft">{{ c.ctaBody }}</p>
          <NuxtLink :to="c.ctaTo" class="btn-primary mt-5">{{ c.ctaButton }}</NuxtLink>
        </div>
      </template>
    </section>

    <HesapIcerik v-if="icerik" :icerik="icerik" />

    <ToolFootnote :has-result="Boolean(result)" />
  </div>
</template>

<style scoped>
.hesap-sayilar[open] .hesap-ok {
  transform: rotate(180deg);
}
</style>

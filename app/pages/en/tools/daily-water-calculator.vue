<script setup lang="ts">
import { toolsEn } from '~/data/content.en'
import { calculateGoals } from '#shared/hesap/motor'
import { GLASS_ML, waterGlassesFromTdee } from '#shared/hesap/vucut'
import { ACTIVITY_LEVELS, SEXES, type ActivityLevel, type Sex } from '#shared/hesap/tipler'
import { makulMu } from '#shared/hesap/girdi'
import { mlToFlOz } from '#shared/hesap/birim'

/**
 * Günlük su, İngilizce (/en/tools/daily-water-calculator). Uygulamadaki
 * hesabın aynısı: su ihtiyacı sürdürme enerjisinden türer (1 ml / kcal) ve
 * 6-15 bardak arasına yumuşatılır.
 *
 * Sofra payı gibi burada da YÖN sorulmaz; sürdürme enerjisi kullanılır.
 * Toplam metrik hesaplanır; imperial görünümde yalnız ikinci satır ons olur.
 */
usePageSeo()
const c = toolsEn.water
const icerik = useHesapIcerik(c.slug)
const { imperial } = useUnitSystem()

const sex = ref<Sex>('kadin')
const age = ref<number | null>(null)
const heightCm = ref<number | null>(null)
const weightKg = ref<number | null>(null)
const activity = ref<ActivityLevel>('orta')
const error = ref('')
const glasses = ref<number | null>(null)
const resultEl = ref<HTMLElement | null>(null)

function calculate() {
  error.value = ''
  const a = age.value
  const h = heightCm.value
  const w = weightKg.value
  if (a === null || h === null || w === null) {
    error.value = toolsEn.errorMissing
    glasses.value = null
    return
  }
  if (!makulMu('yas', a) || !makulMu('boy', h) || !makulMu('kilo', w)) {
    error.value = toolsEn.errorRange
    glasses.value = null
    return
  }
  const r = calculateGoals({
    sex: sex.value,
    ageYears: Math.round(a),
    heightCm: h,
    weightKg: w,
    activityLevel: activity.value,
    direction: 'duzen',
  })
  const m = r.maintenance
  glasses.value = m ? waterGlassesFromTdee((m.range.min + m.range.max) / 2) : null
  void nextTick(() => resultEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

const one = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n)
const zero = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)

/** İkinci satır: metrikte litre, imperial'de ABD sıvı onsu. */
const volume = computed(() => {
  if (glasses.value === null) return ''
  const ml = glasses.value * GLASS_ML
  return imperial.value ? `${zero(mlToFlOz(ml))} fl oz` : `${one(ml / 1000)} L`
})
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

    <form class="mt-9 rounded-3xl border border-line bg-surface p-6 sm:p-7" @submit.prevent="calculate">
      <div class="flex flex-wrap items-start justify-between gap-5">
        <HesapSecim
          v-model="sex"
          :label="toolsEn.plate.sexLabel"
          :secenekler="SEXES.map((s) => ({ key: s.key, label: toolsEn.sexLabels[s.key] ?? s.label }))"
        />
        <ToolUnitToggle />
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-3">
        <ToolField
          v-model="age"
          :label="toolsEn.plate.ageLabel"
          kind="plain"
          :imperial="imperial"
          :ornek="34"
        />
        <ToolField
          v-model="heightCm"
          :label="toolsEn.plate.heightLabel"
          kind="height"
          :imperial="imperial"
          :ornek="172"
        />
        <ToolField
          v-model="weightKg"
          :label="toolsEn.plate.weightLabel"
          kind="weight"
          :imperial="imperial"
          :ornek="74"
        />
      </div>

      <fieldset class="mt-5">
        <legend class="text-sm font-extrabold text-soft">{{ toolsEn.plate.activityLabel }}</legend>
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
        {{ glasses ? c.recalc : c.submit }}
      </button>
    </form>

    <section v-if="glasses" ref="resultEl" class="mt-10 scroll-mt-24" aria-live="polite">
      <ul class="flex flex-col gap-2.5">
        <HesapSatir
          :deger="`${glasses} ${toolsEn.plate.glassWord}`"
          :etiket="c.glassLabel"
          zemin="bg-sut"
          renk="text-sut"
        />
        <HesapSatir :deger="volume" :etiket="c.literLabel" zemin="bg-sut" renk="text-sut" />
      </ul>

      <p class="mt-5 leading-relaxed text-soft">{{ c.context }}</p>

      <div class="mt-8 rounded-3xl border border-brand/30 bg-brand-mint/20 p-7">
        <h2 class="font-display text-xl font-semibold tracking-tight text-ink">{{ c.nextTitle }}</h2>
        <p class="mt-2 leading-relaxed text-soft">{{ c.nextBody }}</p>
        <NuxtLink :to="c.nextTo" class="btn-primary mt-5">{{ c.nextCta }}</NuxtLink>
      </div>
    </section>

    <HesapIcerik v-if="icerik" :icerik="icerik" />

    <ToolFootnote :has-result="Boolean(glasses)" />
  </div>
</template>

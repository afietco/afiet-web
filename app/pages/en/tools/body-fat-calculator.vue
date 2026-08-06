<script setup lang="ts">
import { toolsEn } from '~/data/content.en'
import { bodyComposition } from '#shared/hesap/motor'
import { SEXES, type Sex } from '#shared/hesap/tipler'
import { makulMu } from '#shared/hesap/girdi'
import { kgToLb } from '#shared/hesap/birim'

/**
 * Vücut yağ oranı, İngilizce (/en/tools/body-fat-calculator). ABD Donanması
 * yöntemi; motorun `bodyComposition` çıktısını kullanır. Makul aralık dışına
 * düşen ölçüler BİR VÜCUT DEĞİL, HATALI ÖLÇÜM sayılır ve sayı gösterilmez
 * (motorun kendi kuralı, TR sayfayla aynı).
 *
 * Bilinçli olarak hüküm kuran bant yok: "ideal", "athletic range" gibi
 * etiketler göstermiyoruz. Sayı ve yağsız kütle verilir, yorumu kişiye kalır.
 */
usePageSeo()
const c = toolsEn.fat
const icerik = useHesapIcerik(c.slug)
const { imperial } = useUnitSystem()

const sex = ref<Sex>('kadin')
const heightCm = ref<number | null>(null)
const weightKg = ref<number | null>(null)
const waistCm = ref<number | null>(null)
const neckCm = ref<number | null>(null)
const hipCm = ref<number | null>(null)
const error = ref('')
const result = ref<{ percent: number; ffmKg: number } | null>(null)
const resultEl = ref<HTMLElement | null>(null)

const hipRequired = computed(() => sex.value === 'kadin')

function calculate() {
  error.value = ''
  result.value = null
  const h = heightCm.value
  const w = weightKg.value
  const waist = waistCm.value
  const neck = neckCm.value
  const hip = hipCm.value

  if (h === null || w === null || waist === null || neck === null || (hipRequired.value && hip === null)) {
    error.value = toolsEn.errorMissing
    return
  }
  const outOfRange =
    !makulMu('boy', h) || !makulMu('kilo', w) || !makulMu('bel', waist) ||
    !makulMu('boyun', neck) || (hip !== null && !makulMu('kalca', hip))
  if (outOfRange) {
    error.value = toolsEn.errorRange
    return
  }

  const composition = bodyComposition({
    sex: sex.value,
    heightCm: h,
    weightKg: w,
    measurements: { waistCm: waist, neckCm: neck, hipCm: hip ?? undefined },
  })
  // Motor makul olmayan ölçüde null döner; bunu sayıya çevirmeye çalışma.
  if (composition.bodyFatFraction === null || composition.ffmKg === null) {
    error.value = c.implausible
    return
  }
  result.value = { percent: composition.bodyFatFraction * 100, ffmKg: composition.ffmKg }
  void nextTick(() => resultEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

const one = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n)
/** Yağsız kütle kullanıcının kendi biriminde okunur. */
const leanMass = computed(() => {
  if (!result.value) return ''
  return imperial.value
    ? `${one(kgToLb(result.value.ffmKg))} lb`
    : `${one(result.value.ffmKg)} kg`
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

      <div class="mt-5 grid gap-4 sm:grid-cols-2">
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
        <ToolField
          v-model="waistCm"
          :label="c.waistLabel"
          kind="length"
          :imperial="imperial"
          :ornek="82"
        />
        <ToolField
          v-model="neckCm"
          :label="c.neckLabel"
          kind="length"
          :imperial="imperial"
          :ornek="34"
        />
        <ToolField
          v-if="hipRequired"
          v-model="hipCm"
          :label="c.hipLabel"
          kind="length"
          :imperial="imperial"
          :ornek="98"
        />
      </div>

      <p v-if="error" class="mt-4 font-bold text-meyve" role="alert">{{ error }}</p>
      <button type="submit" class="btn-primary mt-6 w-full sm:w-auto">
        {{ result ? c.recalc : c.submit }}
      </button>
    </form>

    <section class="mt-8 rounded-3xl border border-line bg-surface p-6 sm:p-7">
      <h2 class="font-display text-xl font-semibold tracking-tight text-ink">{{ c.howTitle }}</h2>
      <ol class="mt-3 flex flex-col gap-2">
        <li v-for="(step, i) in c.howSteps" :key="step" class="flex gap-3 text-soft">
          <span
            class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-mint text-xs font-extrabold text-brand-ink"
            aria-hidden="true"
          >
            {{ i + 1 }}
          </span>
          <span class="leading-relaxed">{{ step }}</span>
        </li>
      </ol>
    </section>

    <section v-if="result" ref="resultEl" class="mt-10 scroll-mt-24" aria-live="polite">
      <ul class="flex flex-col gap-2.5">
        <HesapSatir
          :deger="`${one(result.percent)}%`"
          :etiket="c.ratioLabel"
          zemin="bg-protein"
          renk="text-protein"
        />
        <HesapSatir :deger="leanMass" :etiket="c.ffmLabel" zemin="bg-sebze" renk="text-sebze" />
      </ul>

      <p class="mt-5 leading-relaxed text-soft">{{ c.context }}</p>

      <div class="mt-8 rounded-3xl border border-brand/30 bg-brand-mint/20 p-7">
        <h2 class="font-display text-xl font-semibold tracking-tight text-ink">{{ c.nextTitle }}</h2>
        <p class="mt-2 leading-relaxed text-soft">{{ c.nextBody }}</p>
        <NuxtLink :to="c.nextTo" class="btn-primary mt-5">{{ c.nextCta }}</NuxtLink>
      </div>
    </section>

    <HesapIcerik v-if="icerik" :icerik="icerik" />

    <ToolFootnote :has-result="Boolean(result)" />
  </div>
</template>

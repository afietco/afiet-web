<script setup lang="ts">
import { toolsEn } from '~/data/content.en'
import { bmi, bmiRange } from '#shared/hesap/vucut'
import { makulMu } from '#shared/hesap/girdi'

/**
 * Vücut kitle indeksi, İngilizce (/en/tools/bmi-calculator).
 *
 * Hesap TR sayfayla BİREBİR aynı motoru çağırır; İngilizce olan yalnız
 * metin, birim girişi ve sayı biçimidir. Aralık etiketi motorun Türkçe
 * `label`ından DEĞİL, sabit `key`inden çevrilir (content.en.ts > bmiRangeLabels):
 * motor @afiet/core aynasıdır ve değiştirilmez.
 *
 * İdeal kilo ÜRETİLMEZ (hedeflerim.md § 12), hüküm kuran bant gösterilmez.
 */
usePageSeo()
const c = toolsEn.bmi
const icerik = useHesapIcerik(c.slug)
const { imperial } = useUnitSystem()

const heightCm = ref<number | null>(null)
const weightKg = ref<number | null>(null)
const error = ref('')
const result = ref<{ value: number; range: ReturnType<typeof bmiRange> } | null>(null)
const resultEl = ref<HTMLElement | null>(null)

/** Aralık rengi motorun `color` anahtarıyla eşleşir; sınıflar düz metin. */
const RANGE_STYLE: Record<string, { bg: string; text: string }> = {
  sky: { bg: 'bg-sut', text: 'text-sut' },
  emerald: { bg: 'bg-sebze', text: 'text-sebze' },
  amber: { bg: 'bg-tahil', text: 'text-tahil' },
  rose: { bg: 'bg-meyve', text: 'text-meyve' },
}

function calculate() {
  error.value = ''
  const h = heightCm.value
  const w = weightKg.value
  if (h === null || w === null) {
    error.value = toolsEn.errorMissing
    result.value = null
    return
  }
  // Makul aralık denetimi METRİK tabanda; imperial girdi ToolField'de çevrildi.
  if (!makulMu('boy', h) || !makulMu('kilo', w)) {
    error.value = toolsEn.errorRange
    result.value = null
    return
  }
  const value = bmi(w, h)
  result.value = { value, range: bmiRange(value) }
  void nextTick(() => resultEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

const one = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n)
const rangeLabel = computed(() =>
  result.value ? (toolsEn.bmiRangeLabels[result.value.range.key] ?? '') : '',
)
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
      <ToolUnitToggle />
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
      </div>
      <p v-if="error" class="mt-4 font-bold text-meyve" role="alert">{{ error }}</p>
      <button type="submit" class="btn-primary mt-6 w-full sm:w-auto">
        {{ result ? c.recalc : c.submit }}
      </button>
    </form>

    <section v-if="result" ref="resultEl" class="mt-10 scroll-mt-24" aria-live="polite">
      <ul class="flex flex-col gap-2.5">
        <HesapSatir
          :deger="one(result.value)"
          :etiket="c.resultLabel"
          :zemin="RANGE_STYLE[result.range.color]?.bg ?? 'bg-muted'"
          :renk="RANGE_STYLE[result.range.color]?.text ?? 'text-soft'"
        />
        <HesapSatir
          :deger="rangeLabel"
          :etiket="c.rangeLabel"
          :zemin="RANGE_STYLE[result.range.color]?.bg ?? 'bg-muted'"
          :renk="RANGE_STYLE[result.range.color]?.text ?? 'text-soft'"
        />
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

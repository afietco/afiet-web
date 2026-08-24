<script setup lang="ts">
import { hesapla } from '~/data/content'
import { calculateGoals } from '#shared/hesap/motor'
import { GLASS_ML, waterGlassesFromTdee } from '#shared/hesap/vucut'
import { ACTIVITY_LEVELS, SEXES, type ActivityLevel, type Sex } from '#shared/hesap/tipler'
import { makulMu, sayiyaCevir } from '#shared/hesap/girdi'

/**
 * Günlük su. Uygulamadaki hesabın aynısı: su ihtiyacı sürdürme enerjisinden
 * türer (1 ml / kcal), 6 ile 15 bardak arasına yumuşatılır.
 *
 * Sofra payın gibi burada da yön sorulmaz; sürdürme enerjisi kullanılır.
 */
usePageSeo()
const c = hesapla.water
const icerik = useHesapIcerik(c.slug)

const sex = ref<Sex>('kadin')
const yas = ref('')
const boy = ref('')
const kilo = ref('')
const hareket = ref<ActivityLevel>('orta')
const hata = ref('')
const bardak = ref<number | null>(null)
const sonucEl = ref<HTMLElement | null>(null)

function hesaplaSu() {
  hata.value = ''
  const a = sayiyaCevir(yas.value)
  const h = sayiyaCevir(boy.value)
  const w = sayiyaCevir(kilo.value)
  if (a === null || h === null || w === null) {
    hata.value = hesapla.errorMissing
    bardak.value = null
    return
  }
  if (!makulMu('yas', a) || !makulMu('boy', h) || !makulMu('kilo', w)) {
    hata.value = hesapla.errorRange
    bardak.value = null
    return
  }
  const r = calculateGoals({
    sex: sex.value,
    ageYears: Math.round(a),
    heightCm: h,
    weightKg: w,
    activityLevel: hareket.value,
    direction: 'duzen',
  })
  const m = r.maintenance
  bardak.value = m ? waterGlassesFromTdee((m.range.min + m.range.max) / 2) : null
  void nextTick(() => sonucEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

const litre = computed(() =>
  bardak.value === null
    ? ''
    : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(
        (bardak.value * GLASS_ML) / 1000,
      ),
)
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

    <form
      class="mt-9 rounded-3xl border border-line bg-surface p-6 sm:p-7"
      @submit.prevent="hesaplaSu"
    >
      <HesapSecim v-model="sex" label="Cinsiyet" :secenekler="SEXES" />
      <div class="mt-5 grid gap-4 sm:grid-cols-3">
        <HesapAlan v-model="yas" label="Yaş" ornek="34" />
        <HesapAlan v-model="boy" label="Boy" birim="cm" ornek="172" />
        <HesapAlan v-model="kilo" label="Kilo" birim="kg" ornek="74" />
      </div>
      <fieldset class="mt-5">
        <legend class="text-sm font-extrabold text-soft">Gün içinde ne kadar hareket edersin?</legend>
        <div class="mt-2 flex flex-col gap-2">
          <label
            v-for="a in ACTIVITY_LEVELS"
            :key="a.key"
            class="flex cursor-pointer items-baseline gap-3 rounded-2xl border px-4 py-3 transition"
            :class="
              hareket === a.key
                ? 'border-brand bg-brand-mint/25'
                : 'border-line bg-canvas hover:border-brand/40'
            "
          >
            <input v-model="hareket" type="radio" :value="a.key" class="sr-only" />
            <span class="font-extrabold text-ink">{{ a.label }}</span>
            <span class="text-sm text-soft">{{ a.description }}</span>
          </label>
        </div>
      </fieldset>
      <p v-if="hata" class="mt-4 font-bold text-meyve" role="alert">{{ hata }}</p>
      <button type="submit" class="btn-primary mt-6 w-full sm:w-auto">
        {{ bardak ? c.recalc : c.submit }}
      </button>
    </form>

    <section v-if="bardak" ref="sonucEl" class="mt-10 scroll-mt-24" aria-live="polite">
      <ul class="flex flex-col gap-2.5">
        <HesapSatir
          :deger="`${bardak} bardak`"
          :etiket="c.glassLabel"
          zemin="bg-sut"
          renk="text-sut"
        />
        <HesapSatir :deger="`${litre} litre`" :etiket="c.literLabel" zemin="bg-sut" renk="text-sut" />
      </ul>

      <p class="mt-5 leading-relaxed text-soft">{{ c.context }}</p>

      <div class="mt-8 rounded-3xl border border-brand/30 bg-brand-mint/20 p-7">
        <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
          {{ c.nextTitle }}
        </h2>
        <p class="mt-2 leading-relaxed text-soft">{{ c.nextBody }}</p>
        <NuxtLink to="/indir" class="btn-primary mt-5">{{ c.nextCta }}</NuxtLink>
      </div>
    </section>

    <HesapIcerik v-if="icerik" :icerik="icerik" />


    <HesapAltBilgi :sonuc-var="Boolean(bardak)" />
  </div>
</template>

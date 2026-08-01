<script setup lang="ts">
import { hesapla } from '~/data/content'
import { bodyComposition } from '#shared/hesap/motor'
import { SEXES, type Sex } from '#shared/hesap/tipler'
import { makulMu, sayiyaCevir } from '#shared/hesap/girdi'

/**
 * Vücut yağ oranı (ABD Donanması yöntemi). Motorun `bodyComposition` çıktısını
 * kullanır; makul aralık dışına düşen ölçüler BİR VÜCUT DEĞİL, HATALI ÖLÇÜM
 * sayılır ve sayı gösterilmez (motorun kendi kuralı).
 *
 * Bilinçli olarak hüküm kuran etiket yok: "ideal", "yüksek", "sporcu aralığı"
 * gibi bantlar göstermiyoruz. Uygulama da göstermiyor. Sayı ve yağsız kütle
 * verilir, yorumu kişiye ve hekimine bırakılır.
 */
usePageSeo()
const c = hesapla.fat
const icerik = useHesapIcerik(c.slug)

const sex = ref<Sex>('kadin')
const boy = ref('')
const kilo = ref('')
const bel = ref('')
const boyun = ref('')
const kalca = ref('')
const hata = ref('')
const sonuc = ref<{ oran: number; ffm: number } | null>(null)
const sonucEl = ref<HTMLElement | null>(null)

const kalcaGerekli = computed(() => sex.value === 'kadin')

function hesaplaOran() {
  hata.value = ''
  sonuc.value = null
  const h = sayiyaCevir(boy.value)
  const w = sayiyaCevir(kilo.value)
  const b = sayiyaCevir(bel.value)
  const n = sayiyaCevir(boyun.value)
  const k = sayiyaCevir(kalca.value)

  if (h === null || w === null || b === null || n === null || (kalcaGerekli.value && k === null)) {
    hata.value = hesapla.errorMissing
    return
  }
  const disarida =
    !makulMu('boy', h) || !makulMu('kilo', w) || !makulMu('bel', b) ||
    !makulMu('boyun', n) || (k !== null && !makulMu('kalca', k))
  if (disarida) {
    hata.value = hesapla.errorRange
    return
  }

  const k2 = bodyComposition({
    sex: sex.value,
    heightCm: h,
    weightKg: w,
    measurements: { waistCm: b, neckCm: n, hipCm: k ?? undefined },
  })
  // Motor makul olmayan ölçüde null döner; bunu sayıya çevirmeye çalışma.
  if (k2.bodyFatFraction === null || k2.ffmKg === null) {
    hata.value = c.implausible
    return
  }
  sonuc.value = { oran: k2.bodyFatFraction * 100, ffm: k2.ffmKg }
  void nextTick(() => sonucEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

const bir = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(n)
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
      @submit.prevent="hesaplaOran"
    >
      <HesapSecim v-model="sex" label="Cinsiyet" :secenekler="SEXES" />
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <HesapAlan v-model="boy" label="Boy" birim="cm" ornek="172" />
        <HesapAlan v-model="kilo" label="Kilo" birim="kg" ornek="74" />
        <HesapAlan v-model="bel" label="Bel çevresi" birim="cm" ornek="82" />
        <HesapAlan v-model="boyun" label="Boyun çevresi" birim="cm" ornek="34" />
        <HesapAlan v-if="kalcaGerekli" v-model="kalca" label="Kalça çevresi" birim="cm" ornek="98" />
      </div>
      <p v-if="hata" class="mt-4 font-bold text-meyve" role="alert">{{ hata }}</p>
      <button type="submit" class="btn-primary mt-6 w-full sm:w-auto">
        {{ sonuc ? c.recalc : c.submit }}
      </button>
    </form>

    <section class="mt-8 rounded-3xl border border-line bg-surface p-6 sm:p-7">
      <h2 class="font-display text-xl font-semibold tracking-tight text-ink">{{ c.howTitle }}</h2>
      <ol class="mt-3 flex flex-col gap-2">
        <li v-for="(adim, i) in c.howSteps" :key="adim" class="flex gap-3 text-soft">
          <span
            class="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-mint text-xs font-extrabold text-brand-ink"
            aria-hidden="true"
          >
            {{ i + 1 }}
          </span>
          <span class="leading-relaxed">{{ adim }}</span>
        </li>
      </ol>
    </section>

    <section v-if="sonuc" ref="sonucEl" class="mt-10 scroll-mt-24" aria-live="polite">
      <ul class="flex flex-col gap-2.5">
        <HesapSatir
          :deger="`%${bir(sonuc.oran)}`"
          :etiket="c.ratioLabel"
          zemin="bg-protein"
          renk="text-protein"
        />
        <HesapSatir
          :deger="`${bir(sonuc.ffm)} kg`"
          :etiket="c.ffmLabel"
          zemin="bg-sebze"
          renk="text-sebze"
        />
      </ul>

      <p class="mt-5 leading-relaxed text-soft">{{ c.context }}</p>

      <div class="mt-8 rounded-3xl border border-brand/30 bg-brand-mint/20 p-7">
        <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
          {{ c.nextTitle }}
        </h2>
        <p class="mt-2 leading-relaxed text-soft">{{ c.nextBody }}</p>
        <NuxtLink to="/beta" class="btn-primary mt-5">{{ c.nextCta }}</NuxtLink>
      </div>
    </section>

    <HesapIcerik v-if="icerik" :icerik="icerik" />


    <HesapAltBilgi :sonuc-var="Boolean(sonuc)" />
  </div>
</template>

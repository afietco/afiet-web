<script setup lang="ts">
import { hesapla } from '~/data/content'
import { bmi, bmiRange } from '#shared/hesap/vucut'
import { makulMu, sayiyaCevir } from '#shared/hesap/girdi'

/**
 * Vücut kitle indeksi. Aralık ETİKETLERİ uygulamanın kendi yargısız
 * adlandırmasıdır (İnce aralık / Denge aralığı / Denge üstü / Yüksek aralık);
 * "obez", "fazla kilolu" gibi hüküm kuran kelimeler kullanılmaz.
 *
 * İdeal kilo ÜRETİLMEZ (hedeflerim.md § 12). Rakiplerin hepsi veriyor; bizim
 * farkımız tam olarak vermememiz.
 */
usePageSeo()
const c = hesapla.bmi

const boy = ref('')
const kilo = ref('')
const hata = ref('')
const sonuc = ref<{ deger: number; aralik: ReturnType<typeof bmiRange> } | null>(null)
const sonucEl = ref<HTMLElement | null>(null)

/** Aralık rengi uygulamadaki `BmiRange.color` ile eşleşir; sınıflar düz metin. */
const ARALIK_STIL: Record<string, { zemin: string; renk: string }> = {
  sky: { zemin: 'bg-sut', renk: 'text-sut' },
  emerald: { zemin: 'bg-sebze', renk: 'text-sebze' },
  amber: { zemin: 'bg-tahil', renk: 'text-tahil' },
  rose: { zemin: 'bg-meyve', renk: 'text-meyve' },
}

function hesaplaIndeks() {
  hata.value = ''
  const h = sayiyaCevir(boy.value)
  const w = sayiyaCevir(kilo.value)
  if (h === null || w === null) {
    hata.value = hesapla.errorMissing
    sonuc.value = null
    return
  }
  if (!makulMu('boy', h) || !makulMu('kilo', w)) {
    hata.value = hesapla.errorRange
    sonuc.value = null
    return
  }
  const deger = bmi(w, h)
  sonuc.value = { deger, aralik: bmiRange(deger) }
  void nextTick(() => sonucEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

const bicimli = (n: number) => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(n)
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
      @submit.prevent="hesaplaIndeks"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <HesapAlan v-model="boy" label="Boy" birim="cm" ornek="172" />
        <HesapAlan v-model="kilo" label="Kilo" birim="kg" ornek="74" />
      </div>
      <p v-if="hata" class="mt-4 font-bold text-meyve" role="alert">{{ hata }}</p>
      <button type="submit" class="btn-primary mt-6 w-full sm:w-auto">
        {{ sonuc ? c.recalc : c.submit }}
      </button>
    </form>

    <section v-if="sonuc" ref="sonucEl" class="mt-10 scroll-mt-24" aria-live="polite">
      <ul class="flex flex-col gap-2.5">
        <HesapSatir
          :deger="bicimli(sonuc.deger)"
          :etiket="c.resultLabel"
          :zemin="ARALIK_STIL[sonuc.aralik.color]?.zemin ?? 'bg-muted'"
          :renk="ARALIK_STIL[sonuc.aralik.color]?.renk ?? 'text-soft'"
        />
        <HesapSatir
          :deger="sonuc.aralik.label"
          :etiket="c.rangeLabel"
          :zemin="ARALIK_STIL[sonuc.aralik.color]?.zemin ?? 'bg-muted'"
          :renk="ARALIK_STIL[sonuc.aralik.color]?.renk ?? 'text-soft'"
        />
      </ul>

      <p class="mt-5 leading-relaxed text-soft">{{ c.context }}</p>

      <div class="mt-8 rounded-3xl border border-brand/30 bg-brand-mint/20 p-7">
        <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
          {{ c.nextTitle }}
        </h2>
        <p class="mt-2 leading-relaxed text-soft">{{ c.nextBody }}</p>
        <NuxtLink to="/hesapla/sofra-payin" class="btn-primary mt-5">{{ c.nextCta }}</NuxtLink>
      </div>
    </section>

    <HesapAltBilgi :sonuc-var="Boolean(sonuc)" />
  </div>
</template>

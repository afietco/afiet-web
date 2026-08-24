<script setup lang="ts">
import type { Accent, BasinCopy } from '~/data/content'
import type { SiteLocale } from '#shared/utils/locales'
import { authorProfile } from '#shared/utils/author'
import { BASIN_VARLIKLARI, MARKA_KUNYE, MARKA_TANIM } from '#shared/utils/marka'

/**
 * Basın kitinin gövdesi; /basin (content.ts > basin) ve /en/press
 * (content.en.ts > pressEn) aynı bileşeni basar.
 *
 * Sayfanın işi ikna değil KOLAYLAŞTIRMA: gazetecinin yazıya koyacağı üç şey
 * (tek cümle, künye, görsel) tek tıkla alınabilir olmalı. Bu yüzden tanım
 * kutusu kopyalanabilir, görseller tam çözünürlüğe doğrudan bağlanır ve
 * hiçbir malzeme form arkasında durmaz.
 *
 * Metnin kendisi kopya dosyasından, OLGULAR `#shared/utils/marka`dan gelir;
 * ikisi ayrı kaynaktır çünkü tanım ve künye sitenin başka yerlerinde de
 * kullanılır ve basın sayfası onların kopyasını taşımaz.
 */
const props = withDefaults(defineProps<{ copy: BasinCopy; lang?: SiteLocale }>(), {
  lang: 'tr',
})

const author = computed(() => authorProfile(props.lang))
const tanim = computed(() => MARKA_TANIM[props.lang])

/* Künye satırları: etiket kopyadan, değer marka kaydından. */
const kunye = computed(() => {
  const l = props.copy.kunyeLabels
  return [
    { k: l.ad, v: MARKA_KUNYE.ad, not: props.copy.adNot },
    { k: l.tagline, v: MARKA_KUNYE.tagline[props.lang] },
    { k: l.kategori, v: props.copy.kategori },
    { k: l.platformlar, v: MARKA_KUNYE.platformlar[props.lang] },
    { k: l.lansman, v: MARKA_KUNYE.lansman[props.lang] },
    { k: l.ulke, v: MARKA_KUNYE.ulke },
    { k: l.dil, v: MARKA_KUNYE.dil[props.lang] },
    { k: l.site, v: 'afiet.co', href: MARKA_KUNYE.site },
    { k: l.eposta, v: MARKA_KUNYE.eposta, href: `mailto:${MARKA_KUNYE.eposta}` },
  ]
})

/* Kopyalama yalnız tarayıcıda çalışır; pano yoksa (izin verilmemiş, güvensiz
   köken) sessizce hiçbir şey yapmaz, sayfa yine de metni seçilebilir gösterir. */
const kopyalandi = ref(false)
let zamanlayici: ReturnType<typeof setTimeout> | undefined

async function tanimiKopyala() {
  try {
    await navigator.clipboard.writeText(tanim.value)
    kopyalandi.value = true
    clearTimeout(zamanlayici)
    zamanlayici = setTimeout(() => (kopyalandi.value = false), 2000)
  } catch {
    /* pano yok: kullanıcı metni elle seçer */
  }
}

onBeforeUnmount(() => clearTimeout(zamanlayici))

const ACCENT_DOT: Record<Accent, string> = {
  sebze: 'bg-sebze',
  meyve: 'bg-meyve',
  protein: 'bg-protein',
  tahil: 'bg-tahil',
  sut: 'bg-sut',
}

const ad = (key: string) => props.copy.varlikAdlari[key] ?? key
</script>

<template>
  <div class="mx-auto max-w-3xl px-5 py-14 sm:py-20">
    <header>
      <p class="text-xs font-extrabold tracking-widest text-brand uppercase">{{ copy.eyebrow }}</p>
      <h1
        class="mt-3 font-display text-4xl leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[2.75rem]"
      >
        {{ copy.title }}
      </h1>
      <p class="mt-4 text-[17px] leading-relaxed font-semibold text-soft">{{ copy.sub }}</p>
    </header>

    <!-- Tek cümlelik tanım: sayfanın asıl ürünü, o yüzden en üstte ve kopyalanabilir -->
    <section class="mt-10 rounded-3xl border border-brand/25 bg-brand-mint/20 p-6 shadow-lift sm:p-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
          {{ copy.tanimTitle }}
        </h2>
        <button type="button" class="btn-ghost px-5 py-2 text-sm" @click="tanimiKopyala">
          <span
            class="h-2 w-2 rounded-full transition"
            :class="kopyalandi ? 'bg-brand' : 'bg-muted'"
            aria-hidden="true"
          />
          {{ kopyalandi ? copy.kopyalandi : copy.kopyala }}
        </button>
      </div>
      <p class="mt-4 font-display text-xl leading-relaxed font-semibold text-ink sm:text-[1.4rem]">
        {{ tanim }}
      </p>
      <p class="mt-3 text-sm font-semibold text-soft">{{ copy.tanimNote }}</p>
    </section>

    <!-- Künye -->
    <section class="mt-14">
      <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
        {{ copy.kunyeTitle }}
      </h2>
      <dl class="mt-6 overflow-hidden rounded-3xl border border-line bg-surface shadow-lift">
        <div
          v-for="(row, i) in kunye"
          :key="row.k"
          class="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-baseline sm:gap-6"
          :class="i > 0 ? 'border-t border-line' : ''"
        >
          <dt class="text-xs font-extrabold tracking-widest text-muted uppercase sm:w-40 sm:shrink-0">
            {{ row.k }}
          </dt>
          <dd class="font-bold text-ink">
            <a
              v-if="row.href"
              :href="row.href"
              class="text-brand underline decoration-brand-mint decoration-2 underline-offset-4 transition hover:text-brand-deep"
            >
              {{ row.v }}
            </a>
            <span v-else>{{ row.v }}</span>
            <span v-if="row.not" class="mt-1 block text-sm font-semibold text-soft">
              {{ row.not }}
            </span>
          </dd>
        </div>
      </dl>
    </section>

    <!-- Uzun tanım: haberin sonuna konacak paragraf -->
    <section class="mt-14">
      <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
        {{ copy.uzunTitle }}
      </h2>
      <p class="mt-2 text-sm font-semibold text-soft">{{ copy.uzunNote }}</p>
      <div class="mt-5 flex flex-col gap-3 rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
        <p class="leading-relaxed font-semibold text-soft">{{ tanim }}</p>
        <p v-for="(p, i) in copy.uzun" :key="i" class="leading-relaxed font-semibold text-soft">
          {{ p }}
        </p>
      </div>
    </section>

    <!-- Sık düşülen hatalar: yanlış çerçeveyi baştan kapatır -->
    <section class="mt-14">
      <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
        {{ copy.yanlisTitle }}
      </h2>
      <ul class="mt-6 flex flex-col gap-4">
        <li
          v-for="y in copy.yanlis"
          :key="y.title"
          class="rounded-2xl border border-line bg-surface p-5 shadow-lift"
        >
          <div class="flex items-center gap-2.5">
            <span :class="['h-2.5 w-2.5 shrink-0 rounded-full', ACCENT_DOT[y.accent]]" />
            <h3 class="font-extrabold tracking-tight text-ink">{{ y.title }}</h3>
          </div>
          <p class="mt-2 text-[15px] leading-relaxed font-semibold text-soft">{{ y.body }}</p>
        </li>
      </ul>
    </section>

    <!-- İndirilebilir malzeme -->
    <section class="mt-14">
      <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
        {{ copy.varlikTitle }}
      </h2>
      <p class="mt-2 leading-relaxed font-semibold text-soft">{{ copy.varlikSub }}</p>

      <div class="mt-6 flex flex-wrap items-center gap-4">
        <a :href="BASIN_VARLIKLARI.zip" class="btn-primary" download>{{ copy.zipLabel }}</a>
        <p class="text-sm font-semibold text-soft">{{ copy.zipNote }}</p>
      </div>

      <h3 class="mt-10 font-display text-xl font-semibold tracking-tight text-ink">
        {{ copy.logoTitle }}
      </h3>
      <p class="mt-1 text-sm font-semibold text-soft">{{ copy.logoSub }}</p>
      <ul class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <li
          v-for="logo in BASIN_VARLIKLARI.logolar"
          :key="logo.key"
          class="overflow-hidden rounded-2xl border border-line bg-surface shadow-lift"
        >
          <div
            class="flex h-32 items-center justify-center px-8"
            :class="logo.koyu ? 'bg-brand-ink' : 'bg-canvas'"
          >
            <img :src="logo.svg" :alt="ad(logo.key)" class="max-h-14 w-auto max-w-full" />
          </div>
          <div class="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
            <span class="text-sm font-bold text-ink">{{ ad(logo.key) }}</span>
            <a
              :href="logo.svg"
              download
              class="text-xs font-extrabold tracking-widest text-brand uppercase transition hover:text-brand-deep"
            >
              {{ copy.logoIndir }}
            </a>
          </div>
        </li>
      </ul>

      <h3 class="mt-10 font-display text-xl font-semibold tracking-tight text-ink">
        {{ copy.ekranTitle }}
      </h3>
      <p class="mt-1 text-sm font-semibold text-soft">{{ copy.ekranSub }}</p>
      <ul class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <li v-for="ekran in BASIN_VARLIKLARI.ekranlar" :key="ekran.key">
          <a
            :href="ekran.tam"
            target="_blank"
            rel="noopener"
            class="group block overflow-hidden rounded-2xl border border-line bg-surface shadow-lift transition hover:-translate-y-0.5 hover:shadow-float"
          >
            <img
              :src="ekran.onizleme"
              :alt="ad(ekran.key)"
              width="428"
              height="926"
              loading="lazy"
              class="block w-full"
            />
            <span class="block px-4 py-3 text-sm font-bold text-ink transition group-hover:text-brand-deep">
              {{ ad(ekran.key) }}
            </span>
          </a>
        </li>
      </ul>
    </section>

    <!-- Marka kullanımı -->
    <section class="mt-14">
      <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
        {{ copy.kurallarTitle }}
      </h2>
      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-line bg-surface p-5 shadow-lift">
          <h3 class="text-xs font-extrabold tracking-widest text-brand uppercase">
            {{ copy.kurallarYapTitle }}
          </h3>
          <ul class="mt-3 flex flex-col gap-2.5">
            <li v-for="k in copy.kurallarYap" :key="k" class="flex gap-2.5">
              <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
              <span class="text-[15px] leading-relaxed font-semibold text-soft">{{ k }}</span>
            </li>
          </ul>
        </div>
        <div class="rounded-2xl border border-line bg-surface p-5 shadow-lift">
          <h3 class="text-xs font-extrabold tracking-widest text-muted uppercase">
            {{ copy.kurallarYapmaTitle }}
          </h3>
          <ul class="mt-3 flex flex-col gap-2.5">
            <li v-for="k in copy.kurallarYapma" :key="k" class="flex gap-2.5">
              <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted" aria-hidden="true" />
              <span class="text-[15px] leading-relaxed font-semibold text-soft">{{ k }}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Kurucu: /hakkinda'daki Person kimliğinin aynısı, kopyası değil -->
    <section class="mt-14 rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
      <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
        {{ copy.kurucuTitle }}
      </h2>
      <div class="mt-5 flex items-center gap-4">
        <AfiMascot class="h-14 w-14 shrink-0" aria-hidden="true" />
        <div>
          <p class="font-display text-2xl font-semibold tracking-tight text-ink">
            {{ author.name }}
          </p>
          <p class="text-sm font-extrabold text-brand-deep">{{ author.jobTitle }}</p>
        </div>
      </div>
      <p class="mt-4 leading-relaxed font-semibold text-soft">{{ author.bio }}</p>
      <p class="mt-3 text-sm font-semibold text-soft">{{ copy.kurucuNot }}</p>
    </section>

    <!-- İletişim -->
    <section class="mt-10 rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
      <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
        {{ copy.iletisimTitle }}
      </h2>
      <p class="mt-2 leading-relaxed font-semibold text-soft">{{ copy.iletisimBody }}</p>
      <div class="mt-5 flex flex-wrap items-center gap-4">
        <a :href="`mailto:${copy.mailAddress}`" class="btn-primary">{{ copy.mailAddress }}</a>
      </div>
      <div class="mt-6 border-t border-line pt-5">
        <SocialIcons size="lg" />
      </div>
    </section>
  </div>
</template>

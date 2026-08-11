<script setup lang="ts">
import type { Accent, HakkindaCopy } from '~/data/content'
import type { SiteLocale } from '#shared/utils/locales'
import { authorProfile } from '#shared/utils/author'

/**
 * Yazar sayfasının gövdesi; /hakkinda (content.ts > hakkinda) ve /en/about
 * (content.en.ts > aboutEn) aynı bileşeni basar.
 *
 * NEDEN VAR: blog ve destek yazılarının Person şeması bu sayfanın adresine
 * bağlanır (shared/utils/author.ts > personSchema). Yani sayfa kaldırılırsa
 * şemadaki `url`/`@id` boşa düşer ve yazar kimliği yarım kalır. Sayfadaki ad
 * ve unvan da o kayıttan gelir; kopya dosyası yalnız uzun anlatımı taşır.
 *
 * Görünür yayın ilkeleri bilinçli olarak burada: beslenme YMYL bir alan ve
 * "neye dayanarak yazıyorsunuz" sorusunun cevabı sayfada okunabilir olmalı,
 * yalnız şemada değil.
 */
const props = withDefaults(defineProps<{ copy: HakkindaCopy; lang?: SiteLocale }>(), {
  lang: 'tr',
})

const author = computed(() => authorProfile(props.lang))

/* Aksan renkleri: uygulamadaki besin grubu renkleri (KartpostalIletisim'deki
   pul sözleşmesinin aynısı). Tailwind sınıfları tam metin olarak yazılır,
   yoksa derleyici tarama sırasında göremez. */
const ACCENT_DOT: Record<Accent, string> = {
  sebze: 'bg-sebze',
  meyve: 'bg-meyve',
  protein: 'bg-protein',
  tahil: 'bg-tahil',
  sut: 'bg-sut',
}
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

    <!-- Yazar künyesi: sayfanın konusu olan kişi, Person şemasının görünür yüzü -->
    <section class="mt-10 rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
      <div class="flex items-center gap-4">
        <AfiMascot class="h-14 w-14 shrink-0" aria-hidden="true" />
        <div>
          <p class="text-xs font-extrabold tracking-widest text-muted uppercase">
            {{ copy.bioTitle }}
          </p>
          <p class="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
            {{ author.name }}
          </p>
          <p class="text-sm font-extrabold text-brand-deep">{{ author.jobTitle }}</p>
        </div>
      </div>
      <div class="mt-5 flex flex-col gap-3">
        <p v-for="(p, i) in copy.bio" :key="i" class="leading-relaxed font-semibold text-soft">
          {{ p }}
        </p>
      </div>
    </section>

    <!-- Yayın ilkeleri -->
    <section class="mt-14">
      <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
        {{ copy.principlesTitle }}
      </h2>
      <ul class="mt-6 flex flex-col gap-4">
        <li
          v-for="p in copy.principles"
          :key="p.title"
          class="rounded-2xl border border-line bg-surface p-5 shadow-lift"
        >
          <div class="flex items-center gap-2.5">
            <span :class="['h-2.5 w-2.5 shrink-0 rounded-full', ACCENT_DOT[p.accent]]" />
            <h3 class="font-extrabold tracking-tight text-ink">{{ p.title }}</h3>
          </div>
          <p class="mt-2 text-[15px] leading-relaxed font-semibold text-soft">{{ p.body }}</p>
        </li>
      </ul>
    </section>

    <!-- Kaynaklar: dış bağlantılar bilinçli olarak görünür; iddianın nereden
         geldiğini okur da motor da aynı yerde görsün -->
    <section class="mt-14">
      <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
        {{ copy.sourcesTitle }}
      </h2>
      <p class="mt-2 leading-relaxed font-semibold text-soft">{{ copy.sourcesSub }}</p>
      <ul class="mt-5 flex flex-col gap-2.5">
        <li v-for="s in copy.sources" :key="s.href" class="flex gap-2.5">
          <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-mint" aria-hidden="true" />
          <a
            :href="s.href"
            target="_blank"
            rel="noopener nofollow"
            class="font-bold text-soft underline decoration-brand-mint decoration-2 underline-offset-4 transition hover:text-brand-deep"
          >
            {{ s.label }}
          </a>
        </li>
      </ul>
    </section>

    <!-- İletişim + dış profiller (sameAs'in görünür karşılığı) -->
    <section class="mt-14 rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
      <h2 class="font-display text-2xl font-semibold tracking-tight text-ink">
        {{ copy.contactTitle }}
      </h2>
      <p class="mt-2 leading-relaxed font-semibold text-soft">{{ copy.contactBody }}</p>
      <div class="mt-5 flex flex-wrap items-center gap-4">
        <NuxtLink :to="copy.contactTo" class="btn-primary">{{ copy.contactCta }}</NuxtLink>
        <a
          :href="`mailto:${copy.mailAddress}`"
          class="font-extrabold text-brand transition hover:text-brand-deep"
        >
          {{ copy.mailAddress }}
        </a>
      </div>
      <div class="mt-6 border-t border-line pt-5">
        <SocialIcons size="lg" />
      </div>
    </section>
  </div>
</template>

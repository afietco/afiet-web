<script setup lang="ts">
import { hesapla } from '~/data/content'

/**
 * Hesaplama araçlarının girişi. Şu an tek araç var; yol haritasını kart
 * gibi göstermiyoruz, düz bir cümleyle söylüyoruz. Tıklanamayan "yakında"
 * kartları vaat gibi okunuyor.
 */
usePageSeo()
</script>

<template>
  <div class="mx-auto max-w-6xl px-5 py-14 sm:py-20">
    <header class="mx-auto max-w-2xl text-center">
      <p class="text-sm font-extrabold tracking-wide text-brand">{{ hesapla.eyebrow }}</p>
      <h1 class="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
        {{ hesapla.title }}
      </h1>
      <p class="mt-4 text-[17px] leading-relaxed text-soft">{{ hesapla.sub }}</p>
    </header>

    <h2 class="sr-only">{{ hesapla.toolsTitle }}</h2>
    <div class="mx-auto mt-10 max-w-2xl">
      <NuxtLink
        v-reveal
        :to="`/hesapla/${hesapla.plate.slug}`"
        class="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-7 pl-8 shadow-lift transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-float"
      >
        <span class="absolute inset-y-0 left-0 w-1.5 bg-brand" aria-hidden="true" />
        <h3
          class="font-display text-2xl font-semibold tracking-tight text-ink transition group-hover:text-brand-deep"
        >
          {{ hesapla.plate.eyebrow }}
        </h3>
        <p class="mt-2 leading-relaxed text-soft">{{ hesapla.plate.sub }}</p>
        <p class="mt-5 flex flex-wrap gap-2" aria-hidden="true">
          <span
            v-for="ornek in ['3-4 avuç içi', '4-5 yumruk', '5-6 kapalı avuç', '2-3 başparmak']"
            :key="ornek"
            class="rounded-full bg-canvas px-3 py-1.5 text-sm font-bold text-soft"
          >
            {{ ornek }}
          </span>
        </p>
      </NuxtLink>

      <p class="mt-8 text-center text-sm leading-relaxed text-muted">
        <span class="font-extrabold text-soft">{{ hesapla.soonLabel }}:</span>
        {{ hesapla.soonBody }}
      </p>
    </div>
  </div>
</template>

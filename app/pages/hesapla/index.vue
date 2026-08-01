<script setup lang="ts">
import { hesapla } from '~/data/content'

/**
 * Hesaplama araçlarının girişi. Yol haritasını kart gibi göstermiyoruz;
 * tıklanamayan "yakında" kartları vaat gibi okunuyor, düz bir cümle yeter.
 */
usePageSeo()

/* Tailwind sınıfları kaynakta düz metin olmalı. */
const SERIT: Record<string, string> = {
  sebze: 'bg-sebze',
  tahil: 'bg-tahil',
  sut: 'bg-sut',
  protein: 'bg-protein',
}
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
    <div id="araclar" class="mt-10 grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="arac in hesapla.tools"
        :key="arac.to"
        v-reveal
        :to="arac.to"
        class="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 pl-7 shadow-lift transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-float"
      >
        <span
          class="absolute inset-y-0 left-0 w-1.5"
          :class="SERIT[arac.accent]"
          aria-hidden="true"
        />
        <h3
          class="font-display text-xl font-semibold tracking-tight text-ink transition group-hover:text-brand-deep"
        >
          {{ arac.title }}
        </h3>
        <p class="mt-2 text-sm leading-relaxed text-soft">{{ arac.body }}</p>
        <p class="mt-4 flex flex-wrap gap-1.5" aria-hidden="true">
          <span
            v-for="cip in arac.chips"
            :key="cip"
            class="rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-soft"
          >
            {{ cip }}
          </span>
        </p>
      </NuxtLink>
    </div>

    <p class="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-muted">
      <span class="font-extrabold text-soft">{{ hesapla.soonLabel }}:</span>
      {{ hesapla.soonBody }}
    </p>
  </div>
</template>

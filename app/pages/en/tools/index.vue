<script setup lang="ts">
import { toolsEn } from '~/data/content.en'

/**
 * İngilizce hesaplama araçlarının girişi (/en/tools). TR karşılığı /hesapla.
 * Yol haritası kart olarak gösterilmez; tıklanamayan "yakında" kartı vaat gibi
 * okunur, düz bir cümle yeter (TR'deki kararın aynısı).
 *
 * Dört araç var, TR'de beş: porsiyon çevirici katalog Türkçe olduğu için
 * İngilizce'de açılmadı ve bu, alttaki "coming soon" cümlesinde dürüstçe yazar.
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
      <p class="text-sm font-extrabold tracking-wide text-brand">{{ toolsEn.eyebrow }}</p>
      <h1 class="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
        {{ toolsEn.title }}
      </h1>
      <p class="mt-4 text-[17px] leading-relaxed text-soft">{{ toolsEn.sub }}</p>
    </header>

    <h2 class="sr-only">{{ toolsEn.toolsTitle }}</h2>
    <div id="tools" class="mt-10 grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="tool in toolsEn.tools"
        :key="tool.to"
        v-reveal
        :to="tool.to"
        class="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 pl-7 shadow-lift transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-float"
      >
        <span
          class="absolute inset-y-0 left-0 w-1.5"
          :class="SERIT[tool.accent]"
          aria-hidden="true"
        />
        <h3
          class="font-display text-xl font-semibold tracking-tight text-ink transition group-hover:text-brand-deep"
        >
          {{ tool.title }}
        </h3>
        <p class="mt-2 text-sm leading-relaxed text-soft">{{ tool.body }}</p>
        <p class="mt-4 flex flex-wrap gap-1.5" aria-hidden="true">
          <span
            v-for="chip in tool.chips"
            :key="chip"
            class="rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-soft"
          >
            {{ chip }}
          </span>
        </p>
      </NuxtLink>
    </div>

    <p class="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-muted">
      <span class="font-extrabold text-soft">{{ toolsEn.soonLabel }}:</span>
      {{ toolsEn.soonBody }}
    </p>
  </div>
</template>

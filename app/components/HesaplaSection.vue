<script setup lang="ts">
import { hesapla, homeHesapla } from '~/data/content'

/**
 * Ana sayfadaki hesap araçları vitrini. Kartların TEK kaynağı `hesapla.tools`:
 * /hesapla hub'ı ile bu bölüm aynı listeyi okur, araç eklenince ikisi birden
 * güncellenir. Kartlar hub'dakinin kompakt hali; çipler burada gösterilmez.
 */

const SERIT: Record<string, string> = {
  sebze: 'bg-sebze',
  tahil: 'bg-tahil',
  sut: 'bg-sut',
  protein: 'bg-protein',
  meyve: 'bg-meyve',
}

/* Editoryal ritim (ZagSection'daki gibi): 6 kolonda 2+2+2 üst, 3+3 alt sıra. */
const spans = ['lg:col-span-2', 'lg:col-span-2', 'lg:col-span-2', 'lg:col-span-3', 'lg:col-span-3']
</script>

<template>
  <section id="hesapla" class="scroll-mt-20" aria-labelledby="hesapla-baslik">
    <div class="mx-auto max-w-6xl px-5 py-24">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div class="max-w-2xl">
          <p v-reveal class="flex items-center gap-3 text-sm font-extrabold tracking-wide text-brand">
            <span class="h-px w-8 bg-brand/40" aria-hidden="true" />
            {{ homeHesapla.eyebrow }}
          </p>
          <h2
            id="hesapla-baslik"
            v-reveal="80"
            class="mt-4 font-display text-4xl font-semibold tracking-[-0.015em] text-ink sm:text-5xl"
          >
            {{ homeHesapla.title }}
          </h2>
          <p v-reveal="140" class="mt-4 max-w-xl leading-relaxed font-semibold text-soft">
            {{ homeHesapla.sub }}
          </p>
        </div>
        <NuxtLink v-reveal="180" to="/hesapla" class="btn-ghost shrink-0">
          {{ homeHesapla.cta }}
        </NuxtLink>
      </div>

      <div class="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <NuxtLink
          v-for="(arac, i) in hesapla.tools"
          :key="arac.to"
          v-reveal="i * 70"
          :to="arac.to"
          class="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 pl-7 shadow-lift transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-float"
          :class="spans[i]"
        >
          <span class="absolute inset-y-0 left-0 w-1.5" :class="SERIT[arac.accent]" aria-hidden="true" />
          <h3
            class="font-display text-xl font-semibold tracking-tight text-ink transition group-hover:text-brand-deep"
          >
            {{ arac.title }}
          </h3>
          <p class="mt-2 text-sm leading-relaxed text-soft">{{ arac.body }}</p>
          <span
            class="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand transition group-hover:gap-2.5"
            aria-hidden="true"
          >
            Hesapla
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

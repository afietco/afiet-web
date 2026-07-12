<script setup lang="ts">
import { hero, measureChips, type Accent } from '~/data/content'

const dotClasses: Record<Accent, string> = {
  sebze: 'bg-sebze',
  meyve: 'bg-meyve',
  protein: 'bg-protein',
  tahil: 'bg-tahil',
  sut: 'bg-sut',
}

/* Çipler telefonun çevresine yüzde konumla dağılır; float fazları şaşırtılır. */
const chipSpots = [
  'top-[6%] left-[3%] lg:-left-2',
  'top-[31%] right-[3%] lg:right-[-5%]',
  'bottom-[27%] left-[3%] lg:left-[-7%]',
  'bottom-[6%] right-[5%]',
]
</script>

<template>
  <section class="relative overflow-hidden" aria-labelledby="hero-baslik">
    <!-- sofra ışığı: yumuşak nane ve amber lekeleri -->
    <div class="pointer-events-none absolute -top-40 -left-44 h-[34rem] w-[34rem] rounded-full bg-brand-mint/45 blur-3xl" aria-hidden="true" />
    <div class="pointer-events-none absolute top-1/3 -right-52 h-[30rem] w-[30rem] rounded-full bg-[#fde68a]/45 blur-3xl" aria-hidden="true" />

    <div
      class="relative mx-auto grid max-w-6xl items-center gap-16 px-5 pt-16 pb-24 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24 lg:pb-32"
    >
      <div class="max-w-xl">
        <p
          class="rise inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-mint/30 px-4 py-1.5 text-sm font-extrabold text-brand-deep"
        >
          <span class="h-2 w-2 rounded-full bg-brand-bright" aria-hidden="true" />
          {{ hero.eyebrow }}
        </p>

        <h1
          id="hero-baslik"
          class="rise mt-6 text-6xl leading-[0.95] font-black tracking-tight text-ink sm:text-7xl lg:text-[5.2rem]"
          style="--d: 80ms"
        >
          {{ hero.titleA }}<br />
          <span class="relative inline-block text-brand">
            {{ hero.titleB }}
            <svg
              class="absolute right-0 -bottom-3 left-0 h-4 w-full text-brand-bright"
              viewBox="0 0 220 14"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M4 10 Q 56 3 108 7 T 216 6"
                fill="none"
                stroke="currentColor"
                stroke-width="6"
                stroke-linecap="round"
                opacity="0.55"
              />
            </svg>
          </span>
        </h1>

        <p class="rise mt-7 text-lg leading-relaxed font-semibold text-soft sm:text-xl" style="--d: 160ms">
          {{ hero.sub }}
        </p>

        <div class="rise mt-9 flex flex-wrap items-center gap-3" style="--d: 240ms">
          <a href="#haber" class="btn-primary">{{ hero.ctaPrimary }}</a>
          <a href="#neden" class="btn-ghost">{{ hero.ctaSecondary }}</a>
        </div>

        <div class="rise mt-9" style="--d: 320ms">
          <StoreBadges />
        </div>
      </div>

      <div class="rise relative" style="--d: 200ms">
        <div class="animate-float">
          <PhoneMock />
        </div>

        <!-- sofranın ölçü dili, telefonun çevresinde -->
        <div class="pointer-events-none absolute inset-0" aria-hidden="true">
          <span
            v-for="(chip, i) in measureChips"
            :key="chip.label"
            class="absolute flex animate-float items-center gap-2 rounded-full border border-line/80 bg-surface/95 px-4 py-2 text-sm font-extrabold text-ink shadow-lift"
            :class="chipSpots[i]"
            :style="{ animationDelay: `${-1.4 * (i + 1)}s`, rotate: `${[-4, 3, -3, 5][i]}deg` }"
          >
            <span class="h-2.5 w-2.5 rounded-full" :class="dotClasses[chip.accent]" />
            {{ chip.label }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

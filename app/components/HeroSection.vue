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

/* Akan şerit hero çiplerinin aynı kopyasıdır (yeni metin yok). Kesintisiz
   döngü için grup şablonda iki kez basılır ve -%50 kaydırılır (main.css). */
const marqueeChips = Array.from({ length: 3 }, () => measureChips).flat()
</script>

<template>
  <section class="relative overflow-hidden" aria-labelledby="hero-baslik">
    <!-- sofra ışığı: tepeden süzülen gün ışığı + yumuşak nane ve amber lekeleri -->
    <div class="pointer-events-none absolute -top-56 left-1/2 h-[30rem] w-[46rem] -translate-x-1/2 rounded-full bg-[#fff3d6]/70 blur-3xl" aria-hidden="true" />
    <div class="pointer-events-none absolute -top-40 -left-44 h-[34rem] w-[34rem] rounded-full bg-brand-mint/45 blur-3xl" aria-hidden="true" />
    <div class="pointer-events-none absolute top-1/3 -right-52 h-[30rem] w-[30rem] rounded-full bg-[#fde68a]/45 blur-3xl" aria-hidden="true" />

    <div
      class="relative mx-auto grid max-w-6xl items-center gap-16 px-5 pt-16 pb-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24 lg:pb-20"
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
          class="rise mt-6 font-display text-[clamp(3.6rem,9vw,6.2rem)] leading-[0.98] font-semibold tracking-[-0.02em] text-ink"
          style="--d: 80ms"
        >
          {{ hero.titleA }}<br />
          <span class="wonk relative inline-block pr-2 text-brand italic">
            {{ hero.titleB }}
            <svg
              class="absolute right-2 -bottom-2 left-0 h-4 w-[calc(100%-0.5rem)] text-brand-bright"
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

        <p class="rise mt-7 max-w-lg text-lg leading-relaxed font-semibold text-pretty text-soft sm:text-xl" style="--d: 160ms">
          {{ hero.sub }}
        </p>

        <div class="rise mt-9 flex flex-wrap items-center gap-3" style="--d: 240ms">
          <NuxtLink to="/beta" class="btn-primary">{{ hero.ctaPrimary }}</NuxtLink>
          <a href="#neden" class="btn-ghost">{{ hero.ctaSecondary }}</a>
        </div>

        <div class="rise mt-9" style="--d: 320ms">
          <StoreBadges />
        </div>
      </div>

      <div class="rise relative" style="--d: 200ms">
        <!-- sofra tabağı: telefonun ardında ağır ağır dönen kesik çizgili halka -->
        <div
          class="pointer-events-none absolute top-1/2 left-1/2 h-[30rem] w-[30rem] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-brand/15 motion-safe:animate-[spin_90s_linear_infinite] sm:h-[34rem] sm:w-[34rem]"
          aria-hidden="true"
        />
        <div
          class="pointer-events-none absolute top-1/2 left-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-mint/25 blur-2xl"
          aria-hidden="true"
        />

        <div class="animate-float">
          <div class="rotate-[1.5deg] transition-transform duration-500 hover:rotate-0">
            <PhoneMock />
          </div>
        </div>

        <!-- sofranın ölçü dili, telefonun çevresinde -->
        <div class="pointer-events-none absolute inset-0" aria-hidden="true">
          <span
            v-for="(chip, i) in measureChips"
            :key="chip.label"
            class="absolute flex animate-float items-center gap-2 rounded-full border border-line/80 bg-surface/90 px-4 py-2 text-sm font-extrabold text-ink shadow-lift backdrop-blur-sm"
            :class="chipSpots[i]"
            :style="{ animationDelay: `${-1.4 * (i + 1)}s`, rotate: `${[-4, 3, -3, 5][i]}deg` }"
          >
            <span class="h-2.5 w-2.5 rounded-full" :class="dotClasses[chip.accent]" />
            {{ chip.label }}
          </span>
        </div>
      </div>
    </div>

    <!-- akan ölçü şeridi: sofranın dili masanın üzerinden süzülür.
         Hero çiplerinin dekoratif tekrarı olduğundan erişilebilirlikte gizli. -->
    <div class="relative py-5" aria-hidden="true">
      <div class="marquee absolute inset-x-[-2%] top-1/2 -translate-y-1/2 -rotate-1 border-y border-line/80 bg-surface/80 py-3.5 backdrop-blur-sm">
        <div class="marquee-track flex w-max items-center">
          <span
            v-for="(chip, i) in [...marqueeChips, ...marqueeChips]"
            :key="i"
            class="mr-10 flex items-center gap-2.5 text-sm font-extrabold whitespace-nowrap text-soft"
          >
            <span class="h-2 w-2 rounded-full" :class="dotClasses[chip.accent]" />
            {{ chip.label }}
          </span>
        </div>
      </div>
      <!-- şeridin dikey yer kaplaması için görünmez ölçü -->
      <div class="invisible py-3.5 text-sm font-extrabold">&nbsp;</div>
    </div>
  </section>
</template>

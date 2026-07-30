<script setup lang="ts">
import { cta } from '~/data/content'
</script>

<template>
  <section id="haber" class="scroll-mt-20" aria-labelledby="haber-baslik">
    <div class="mx-auto max-w-6xl px-5 py-24">
      <div
        v-reveal
        class="relative mx-auto max-w-3xl overflow-hidden rounded-[40px] border border-line bg-surface px-6 py-14 text-center shadow-lift sm:px-14 sm:py-16"
      >
        <!-- sofra örtüsünün üstüne vuran sıcak ışık -->
        <div
          class="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-mint/20 via-transparent to-[#fde68a]/25"
          aria-hidden="true"
        />
        <div class="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-brand-mint/30 blur-3xl" aria-hidden="true" />
        <div class="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#fde68a]/35 blur-3xl" aria-hidden="true" />

        <div class="relative">
          <!-- Afi'nin tabağı: maskotun ardında ağır ağır dönen kesik çizgili halka -->
          <div class="relative mx-auto h-24 w-24">
            <div
              class="pointer-events-none absolute top-1/2 left-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-brand/20 motion-safe:animate-[spin_60s_linear_infinite]"
              aria-hidden="true"
            />
            <AfiMascot class="absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-float" />
          </div>

          <h2
            id="haber-baslik"
            class="mt-9 font-display text-4xl font-semibold tracking-[-0.015em] text-ink sm:text-5xl"
          >
            {{ cta.title }}
          </h2>
          <p class="mx-auto mt-4 max-w-lg text-lg leading-relaxed font-semibold text-soft">
            {{ cta.sub }}
          </p>

          <!-- Landing'in tek dönüşüm noktası: /beta başvurusu. Burada e-posta
               toplanmaz, form beta sayfasında yaşar. -->
          <div class="mt-9 flex flex-col items-center gap-3">
            <NuxtLink :to="cta.betaTo" class="btn-primary !px-8 !py-4 text-base">
              {{ cta.betaCta }}
            </NuxtLink>
            <p class="max-w-sm text-sm font-semibold text-muted">{{ cta.betaNote }}</p>
          </div>

          <div class="mt-9 flex justify-center">
            <StoreBadges size="lg" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

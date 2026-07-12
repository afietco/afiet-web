<script setup lang="ts">
import { cta } from '~/data/content'
</script>

<template>
  <section id="haber" class="scroll-mt-20" aria-labelledby="haber-baslik">
    <div class="mx-auto max-w-6xl px-5 py-24">
      <div
        v-reveal
        class="relative mx-auto max-w-3xl overflow-hidden rounded-[40px] border border-line bg-surface px-6 py-14 text-center shadow-lift sm:px-14"
      >
        <div class="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-brand-mint/30 blur-3xl" aria-hidden="true" />
        <div class="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-[#fde68a]/35 blur-3xl" aria-hidden="true" />

        <div class="relative">
          <AfiMascot class="mx-auto h-20 w-20 animate-float" />
          <h2
            id="haber-baslik"
            class="mt-7 text-4xl font-black tracking-tight text-ink sm:text-5xl"
          >
            {{ cta.title }}
          </h2>
          <p class="mx-auto mt-4 max-w-lg text-lg leading-relaxed font-semibold text-soft">
            {{ cta.sub }}
          </p>

          <div class="mt-9">
            <WaitlistForm />
          </div>

          <div class="mt-9 flex justify-center">
            <StoreBadges size="lg" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

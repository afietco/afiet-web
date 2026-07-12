<script setup lang="ts">
import { zags, zagsIntro, type Accent } from '~/data/content'

const accentClasses: Record<Accent, string> = {
  sebze: 'bg-sebze/10 text-sebze',
  meyve: 'bg-meyve/10 text-meyve',
  protein: 'bg-protein/10 text-protein',
  tahil: 'bg-tahil/10 text-tahil',
  sut: 'bg-sut/10 text-sut',
}
</script>

<template>
  <section id="neden" class="scroll-mt-20" aria-labelledby="neden-baslik">
    <div class="mx-auto max-w-6xl px-5 py-24">
      <div class="mx-auto max-w-2xl text-center">
        <!-- "afiet" hiçbir yerde büyük harfe çevrilmez (BRAND.md) — uppercase yok -->
        <p v-reveal class="text-sm font-extrabold tracking-wide text-brand">
          {{ zagsIntro.eyebrow }}
        </p>
        <h2
          id="neden-baslik"
          v-reveal="80"
          class="mt-3 text-4xl font-black tracking-tight text-ink sm:text-5xl"
        >
          {{ zagsIntro.title }}
        </h2>
      </div>

      <div class="mt-14 grid gap-5 sm:grid-cols-2">
        <article
          v-for="(zag, i) in zags"
          :key="zag.key"
          v-reveal="i * 90"
          class="group rounded-[28px] border border-line bg-surface p-7 transition duration-300 hover:-translate-y-1.5 hover:shadow-lift sm:p-8"
        >
          <div
            class="flex h-13 w-13 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
            :class="accentClasses[zag.accent]"
          >
            <ZagIcon :name="zag.key as 'denge' | 'sofra' | 'aile' | 'sefkat'" />
          </div>
          <h3 class="mt-5 text-2xl font-extrabold tracking-tight">{{ zag.title }}</h3>
          <p class="mt-2.5 leading-relaxed font-semibold text-soft">{{ zag.body }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

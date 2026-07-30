<script setup lang="ts">
import { zags, zagsIntro, type Accent } from '~/data/content'

const accentClasses: Record<Accent, string> = {
  sebze: 'bg-sebze/10 text-sebze',
  meyve: 'bg-meyve/10 text-meyve',
  protein: 'bg-protein/10 text-protein',
  tahil: 'bg-tahil/10 text-tahil',
  sut: 'bg-sut/10 text-sut',
}

/* Kart köşesinde eriyen aksan lekesi - grup rengini fısıldar, bağırmaz. */
const washClasses: Record<Accent, string> = {
  sebze: 'bg-sebze/10',
  meyve: 'bg-meyve/10',
  protein: 'bg-protein/10',
  tahil: 'bg-tahil/10',
  sut: 'bg-sut/10',
}

/* Editoryal ritim: 12 kolonda 7/5, 5/7, 6/6 - simetrik ızgara değil, sayfa
   düzeni gibi akan bir kompozisyon. Mobilde tek, tablette iki kolon. */
const spans = [
  'lg:col-span-7',
  'lg:col-span-5',
  'lg:col-span-5',
  'lg:col-span-7',
  'lg:col-span-6',
  'lg:col-span-6',
]
</script>

<template>
  <section id="neden" class="scroll-mt-20" aria-labelledby="neden-baslik">
    <div class="mx-auto max-w-6xl px-5 py-24">
      <div class="max-w-2xl">
        <!-- "afiet" hiçbir yerde büyük harfe çevrilmez (BRAND.md) - uppercase yok -->
        <p v-reveal class="flex items-center gap-3 text-sm font-extrabold tracking-wide text-brand">
          <span class="h-px w-8 bg-brand/40" aria-hidden="true" />
          {{ zagsIntro.eyebrow }}
        </p>
        <h2
          id="neden-baslik"
          v-reveal="80"
          class="mt-4 font-display text-4xl font-semibold tracking-[-0.015em] text-ink sm:text-5xl"
        >
          {{ zagsIntro.title }}
        </h2>
      </div>

      <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
        <article
          v-for="(zag, i) in zags"
          :key="zag.key"
          v-reveal="i * 90"
          class="group relative overflow-hidden rounded-[28px] border border-line bg-surface p-7 transition duration-300 hover:-translate-y-1.5 hover:shadow-lift sm:p-8"
          :class="spans[i]"
        >
          <!-- hayalet sayı: derginin sayfa numarası gibi, içerik değil doku -->
          <span
            class="pointer-events-none absolute -top-4 right-3 font-display text-[5.5rem] leading-none font-semibold text-ink/[0.05] italic select-none"
            aria-hidden="true"
          >
            0{{ i + 1 }}
          </span>
          <span
            class="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full blur-2xl"
            :class="washClasses[zag.accent]"
            aria-hidden="true"
          />

          <div class="relative">
            <div
              class="flex h-13 w-13 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"
              :class="accentClasses[zag.accent]"
            >
              <ZagIcon :name="zag.key as 'denge' | 'sofra' | 'afi' | 'ritim' | 'aile' | 'sefkat'" />
            </div>
            <h3 class="mt-5 font-display text-2xl font-semibold tracking-tight">{{ zag.title }}</h3>
            <p class="mt-2.5 max-w-md leading-relaxed font-semibold text-soft">{{ zag.body }}</p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

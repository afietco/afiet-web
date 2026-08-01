<script setup lang="ts">
import type { ReleaseSummary } from '#shared/types/release'
import { releases as copy } from '~/data/content'
import { releaseLook } from '~/utils/releaseAccent'

/**
 * Sürüm şeridi: solda zaman çizgisi, üstünde en yeni sürüm. `/yenilikler`
 * listesi ve bilinmeyen sürüm sayfasındaki geri dönüş listesi aynı bileşendir,
 * yani iki yerde iki ayrı görünüm oluşamaz.
 */
defineProps<{ items: ReleaseSummary[] }>()

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${iso}T00:00:00Z`),
  )
</script>

<template>
  <ol class="relative">
    <!-- Zaman çizgisi: kartların solundan geçer, son kartın ortasında biter. -->
    <li
      v-for="(r, i) in items"
      :key="r.version"
      v-reveal
      class="relative pb-5 pl-8 last:pb-0 sm:pl-12"
    >
      <span
        v-if="i < items.length - 1"
        class="absolute top-6 bottom-0 left-[7px] w-px bg-line sm:left-[11px]"
        aria-hidden="true"
      />
      <span
        class="absolute top-5 left-0 h-3.5 w-3.5 rounded-full border-2 border-canvas sm:left-1"
        :class="i === 0 ? 'bg-brand' : 'bg-brand-mint'"
        aria-hidden="true"
      />

      <NuxtLink
        :to="`/yenilikler/${r.version}`"
        class="group block rounded-3xl border border-line bg-surface p-5 shadow-lift transition duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-float sm:p-6"
      >
        <p class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            class="rounded-full px-2.5 py-1 text-xs font-extrabold"
            :class="i === 0 ? 'bg-brand text-white' : 'bg-canvas text-soft'"
          >
            v{{ r.version }}
          </span>
          <time :datetime="r.date" class="text-xs font-bold text-muted">
            {{ formatDate(r.date) }}
          </time>
          <span v-if="i === 0" class="text-xs font-extrabold tracking-wide text-brand">
            {{ copy.latestLabel }}
          </span>
        </p>

        <h3
          class="mt-2.5 font-display text-xl font-semibold tracking-tight text-ink transition group-hover:text-brand-deep sm:text-2xl"
        >
          {{ r.title }}
        </h3>
        <p v-if="r.summary" class="mt-2 text-[15px] leading-relaxed text-soft">{{ r.summary }}</p>

        <p v-if="r.sections.length" class="mt-4 flex flex-wrap gap-1.5">
          <span
            v-for="s in r.sections"
            :key="s.heading"
            class="rounded-full px-2.5 py-1 text-xs font-bold"
            :class="releaseLook(s.heading).chip"
          >
            {{ s.count }} {{ releaseLook(s.heading).singular }}
          </span>
        </p>
      </NuxtLink>
    </li>
  </ol>
</template>

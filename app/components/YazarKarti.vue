<script setup lang="ts">
import type { SiteLocale } from '#shared/utils/locales'
import { authorProfile } from '#shared/utils/author'

/**
 * Yazı sonundaki yazar kartı: kim yazdı, ne yapıyor, nereden devam edilir.
 * Künyeyle (YazarSatiri.vue) aynı kaydı okur (shared/utils/author.ts).
 *
 * Kart yazının SONUNDA durur çünkü burada okur metni bitirmiş, "bunu yazan
 * kim" sorusu tam da orada doğuyor; üstteki tek satırlık künye ise soruyu
 * okumaya başlamadan cevaplar.
 */
const props = withDefaults(
  defineProps<{ title: string; cta: string; lang?: SiteLocale }>(),
  { lang: 'tr' },
)

const author = computed(() => authorProfile(props.lang))
</script>

<template>
  <aside class="rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-7">
    <div class="flex gap-4 sm:gap-5">
      <AfiMascot class="h-12 w-12 shrink-0 sm:h-14 sm:w-14" aria-hidden="true" />
      <div class="min-w-0">
        <p class="text-xs font-extrabold tracking-widest text-muted uppercase">{{ title }}</p>
        <p class="mt-1.5 font-display text-xl font-semibold tracking-tight text-ink">
          {{ author.name }}
        </p>
        <p class="text-sm font-extrabold text-brand-deep">{{ author.jobTitle }}</p>
        <p class="mt-2.5 text-sm leading-relaxed font-semibold text-soft">{{ author.bio }}</p>
        <NuxtLink
          :to="author.path"
          class="mt-4 inline-flex items-center gap-1.5 font-extrabold text-brand transition hover:text-brand-deep"
        >
          {{ cta }}
          <span aria-hidden="true">→</span>
        </NuxtLink>
      </div>
    </div>
  </aside>
</template>

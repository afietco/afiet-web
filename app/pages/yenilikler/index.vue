<script setup lang="ts">
import { releases as copy } from '~/data/content'

/**
 * Sürüm notları listesi. Uygulamadaki "Yenilikler" alt sayfasının web
 * karşılığı: orası kısa özeti gösterir ve buraya bağlanır.
 *
 * İçerik `content/yenilikler/*.md` dosyalarından gelir (veritabanı yok),
 * yani her ortamda doludur ve deploy ile yayınlanır.
 */
usePageSeo()

const { data } = await useFetch('/api/yenilikler', {
  key: 'yenilikler',
  default: () => ({ releases: [], total: 0 }),
})
const items = computed(() => data.value?.releases ?? [])
</script>

<template>
  <section class="mx-auto max-w-3xl px-5 py-14 sm:py-20">
    <header>
      <p class="flex items-center gap-3 text-sm font-extrabold tracking-wide text-brand">
        <span class="h-px w-8 bg-brand/40" aria-hidden="true" />
        {{ copy.eyebrow }}
      </p>
      <h1 class="mt-3 font-display text-4xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
        {{ copy.title }}
      </h1>
      <p class="mt-4 text-[17px] leading-relaxed text-soft">{{ copy.sub }}</p>
    </header>

    <div v-if="items.length" class="mt-10">
      <ReleaseList :items="items" />
    </div>

    <p
      v-else
      class="mt-10 rounded-3xl border border-dashed border-line bg-surface/60 p-10 text-center font-bold text-muted"
    >
      {{ copy.empty }}
    </p>

    <div class="mt-12 grid gap-4 sm:grid-cols-2">
      <div class="rounded-3xl border border-line bg-surface p-6">
        <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
          {{ copy.updateTitle }}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-soft">{{ copy.updateBody }}</p>
        <NuxtLink
          :to="copy.updateTo"
          class="mt-4 inline-block font-extrabold text-brand transition hover:text-brand-deep"
        >
          {{ copy.updateLinkLabel }}
        </NuxtLink>
      </div>
      <div class="rounded-3xl border border-line bg-surface p-6">
        <h2 class="font-display text-xl font-semibold tracking-tight text-ink">
          {{ copy.helpTitle }}
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-soft">{{ copy.helpBody }}</p>
        <NuxtLink
          :to="copy.helpTo"
          class="mt-4 inline-block font-extrabold text-brand transition hover:text-brand-deep"
        >
          {{ copy.helpLinkLabel }}
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

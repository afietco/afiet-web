<script setup lang="ts">
import { hesapSil } from '~/data/content'

// Meta/canonical panelden yönetilir (varsayılanlar kodda — seoDefaults.ts).
usePageSeo()
</script>

<template>
  <article class="mx-auto max-w-2xl px-5 py-14 sm:py-20">
    <header class="border-b border-line pb-6">
      <p class="text-2xl font-extrabold tracking-tight text-brand">afiet</p>
      <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-ink">{{ hesapSil.title }}</h1>
    </header>

    <p class="mt-6 rounded-2xl bg-surface p-5 text-[15px] leading-relaxed text-soft shadow-lift">
      {{ hesapSil.intro }}
    </p>

    <section class="mt-8">
      <h2 class="mb-3 text-lg font-extrabold tracking-tight text-ink">{{ hesapSil.appTitle }}</h2>
      <ol class="flex flex-col gap-2">
        <li
          v-for="(step, i) in hesapSil.steps"
          :key="i"
          class="flex gap-3 text-[15px] leading-relaxed text-soft"
        >
          <span
            class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-mint text-xs font-extrabold text-brand-ink"
          >
            {{ i + 1 }}
          </span>
          <span>{{ step }}</span>
        </li>
      </ol>
    </section>

    <section class="mt-8">
      <h2 class="mb-2 text-lg font-extrabold tracking-tight text-ink">{{ hesapSil.emailTitle }}</h2>
      <p class="text-[15px] leading-relaxed text-soft">{{ hesapSil.emailBody }}</p>
      <a :href="`mailto:${hesapSil.contact}`" class="btn-primary mt-5">E-posta gönder</a>
    </section>
  </article>
</template>

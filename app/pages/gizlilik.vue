<script setup lang="ts">
import { privacy } from '~/data/content'

// Meta/canonical panelden yönetilir (varsayılanlar kodda — seoDefaults.ts).
usePageSeo()
</script>

<template>
  <article class="mx-auto max-w-2xl px-5 py-14 sm:py-20">
    <header class="border-b border-line pb-6">
      <p class="text-2xl font-extrabold tracking-tight text-brand">afiet</p>
      <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-ink">{{ privacy.title }}</h1>
      <p class="mt-1 text-sm text-muted">Yürürlük: {{ privacy.effective }}</p>
    </header>

    <p class="mt-6 rounded-2xl bg-surface p-5 text-[15px] leading-relaxed text-soft shadow-lift">
      {{ privacy.intro }}
    </p>

    <section v-for="s in privacy.sections" :key="s.title" class="mt-8">
      <h2 class="mb-2 text-lg font-extrabold tracking-tight text-ink">{{ s.title }}</h2>
      <p v-for="(p, i) in s.body" :key="i" class="mb-2 text-[15px] leading-relaxed text-soft">
        {{ p }}
      </p>
    </section>

    <NuxtLink to="/hesap-sil" class="btn-ghost mt-10">Hesabını sil →</NuxtLink>
  </article>
</template>

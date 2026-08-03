<script setup lang="ts">
import { footer } from '~/data/content'
</script>

<template>
  <footer class="border-t border-line/70">
    <div
      class="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-10 sm:flex-row sm:justify-between"
    >
      <div class="flex items-center gap-2.5">
        <AfiMascot class="h-8 w-8" />
        <div class="leading-tight">
          <div class="font-extrabold tracking-tight text-brand">afiet</div>
          <div class="text-xs font-bold text-muted">{{ footer.tagline }}</div>
        </div>
      </div>
      <nav
        class="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
        aria-label="Alt bağlantılar"
      >
        <NuxtLink
          v-for="l in footer.links"
          :key="l.to"
          :to="l.to"
          class="text-sm font-bold text-muted transition hover:text-brand-deep"
        >
          {{ l.label }}
        </NuxtLink>
        <span class="hidden h-3.5 w-px bg-line sm:block" aria-hidden="true" />
        <!--
          Dış profiller. rel="me" kimlik doğrulaması içindir ve Organization.sameAs
          ile birlikte çalışır (bkz. app/data/content.ts > footer.social).
        -->
        <a
          v-for="s in footer.social"
          :key="s.href"
          :href="s.href"
          target="_blank"
          rel="me noopener noreferrer"
          class="text-sm font-bold text-muted transition hover:text-brand-deep"
        >
          {{ s.label }}
        </a>
      </nav>
      <p class="text-sm font-bold text-muted">
        <span class="font-display text-base font-medium text-soft italic">{{ footer.signoff }}</span>
        · © {{ new Date().getFullYear() }} afiet
      </p>
    </div>
  </footer>
</template>

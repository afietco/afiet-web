<script setup lang="ts">
import { footer } from '~/data/content'
</script>

<template>
  <footer class="border-t border-line/70">
    <div
      class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-5 py-10 sm:flex-row"
    >
      <div class="flex items-center gap-2.5">
        <AfiMascot class="h-8 w-8" />
        <div class="leading-tight">
          <div class="font-extrabold tracking-tight text-brand">afiet</div>
          <div class="text-xs font-bold text-muted">{{ footer.tagline }}</div>
        </div>
      </div>
      <p class="text-sm font-bold text-muted">
        {{ footer.signoff }} · © {{ new Date().getFullYear() }} afiet
      </p>
    </div>
  </footer>
</template>

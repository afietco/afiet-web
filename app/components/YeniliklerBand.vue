<script setup lang="ts">
import { homeYenilikler } from '~/data/content'

/**
 * Son sürüm şeridi: tek satırlık ince bir duyuru, kendi başına bölüm değil.
 * /api/yenilikler zaten en yeniyi başta döndürür; sürüm yoksa şerit hiç
 * görünmez (yarım veri ile duyuru basılmaz, releaseStore'daki ilkenin aynısı).
 */
const { data } = useFetch('/api/yenilikler', {
  key: 'home-yenilikler',
  default: () => ({ releases: [], total: 0 }),
})
const latest = computed(() => data.value?.releases?.[0] ?? null)

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(
    new Date(`${iso}T00:00:00Z`),
  )
</script>

<template>
  <!-- pb-24: üstteki bölümün alt boşluğuyla (py-24) simetri kurar. -->
  <div v-if="latest" class="mx-auto max-w-6xl px-5 pb-24">
    <NuxtLink
      v-reveal
      :to="`/yenilikler/${latest.version}`"
      class="group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl border border-brand/20 bg-brand-mint/20 px-5 py-4 transition duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift sm:rounded-full sm:px-6"
    >
      <span
        class="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-xs font-extrabold text-white"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        </svg>
        {{ homeYenilikler.label }}
      </span>
      <!-- Sürüm numarası bilinçli yazılmaz (kullanıcı kararı, 5 Ağu 2026):
           ziyaretçiye başlık yeter, numara /yenilikler sayfasında yaşar. -->
      <span class="min-w-0 flex-1 truncate font-bold text-ink">
        {{ latest.title }}
      </span>
      <span class="text-sm font-bold text-muted">{{ fmtDate(latest.date) }}</span>
      <span
        class="inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-deep transition group-hover:gap-2.5"
      >
        {{ homeYenilikler.linkLabel }}
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </NuxtLink>
  </div>
</template>

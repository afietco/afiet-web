<script setup lang="ts">
import { footer } from '~/data/content'

/**
 * Dış profil ikonları (footer + /iletisim). Liste `footer.social`den gelir;
 * her adres `rel="me"` taşır ve seoDefaults > sameAs ile birlikte yaşar
 * (content.ts'teki uyarıya bak). İkonlar inline SVG'dir (repo kuralı:
 * ikon gereken yerde emoji değil SVG).
 */
withDefaults(defineProps<{ size?: 'sm' | 'lg' }>(), { size: 'sm' })
</script>

<template>
  <ul class="flex flex-wrap items-center gap-2" aria-label="Dış profillerimiz">
    <li v-for="s in footer.social" :key="s.href">
      <a
        :href="s.href"
        :aria-label="s.label"
        :title="s.label"
        target="_blank"
        rel="me noopener noreferrer"
        class="flex items-center justify-center rounded-full border border-line bg-surface text-muted transition duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:text-brand-deep hover:shadow-lift"
        :class="size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'"
      >
        <!-- Instagram: çerçeve + mercek + flaş -->
        <svg
          v-if="s.icon === 'instagram'"
          :class="size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
        </svg>

        <!-- Medium: üç elips -->
        <svg
          v-else-if="s.icon === 'medium'"
          :class="size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12Zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42ZM24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75S24 8.83 24 12Z"
          />
        </svg>

        <!-- Substack: iki çizgi + açık kitap gövde -->
        <svg
          v-else-if="s.icon === 'substack'"
          :class="size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M22.54 8.24H1.46V5.4h21.08v2.84ZM1.46 10.81V24L12 18.11 22.54 24V10.81H1.46ZM22.54 0H1.46v2.84h21.08V0Z" />
        </svg>

        <!-- Hashnode: delikli yuvarlak elmas -->
        <svg
          v-else-if="s.icon === 'hashnode'"
          :class="size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M22.35 8.02 15.98 1.65a5.63 5.63 0 0 0-7.96 0L1.65 8.02a5.63 5.63 0 0 0 0 7.96l6.37 6.37a5.63 5.63 0 0 0 7.96 0l6.37-6.37a5.63 5.63 0 0 0 0-7.96ZM12 15.95a3.95 3.95 0 1 1 0-7.9 3.95 3.95 0 0 1 0 7.9Z"
          />
        </svg>

        <!-- LinkedIn -->
        <svg
          v-else-if="s.icon === 'linkedin'"
          :class="size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.04c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"
          />
        </svg>

        <!-- YouTube: yuvarlak köşeli ekran + oynat üçgeni -->
        <svg
          v-else-if="s.icon === 'youtube'"
          :class="size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M23.5 6.9a3.02 3.02 0 0 0-2.12-2.14C19.5 4.25 12 4.25 12 4.25s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.9C0 8.79 0 12 0 12s0 3.21.5 5.1a3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14C24 15.21 24 12 24 12s0-3.21-.5-5.1ZM9.6 15.6V8.4l6.24 3.6-6.24 3.6Z"
          />
        </svg>
      </a>
    </li>
  </ul>
</template>

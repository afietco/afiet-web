<script setup lang="ts">
import { bulten, footer } from '~/data/content'

/**
 * Kendi bülten kutusu olan sayfada bant gizlenir (kullanıcı kararı, 5 Ağu
 * 2026): blog yazısının sonunda ve /iletisim'de bağlama özel kutu var, aynı
 * formu alt alta iki kez basmak tekrar göze batıyordu. /blog listesi bantlı
 * kalır; kutu yalnız yazı sayfasındadır.
 */
const route = useRoute()
const bandGizli = computed(() => route.path === '/iletisim' || /^\/blog\/./.test(route.path))
</script>

<template>
  <footer class="border-t border-line/70">
    <!-- Bülten bandı: alt bilginin hemen üstünde.
         Landing'in e-posta toplama istisnası (content.ts > bulten). -->
    <div v-if="!bandGizli" class="border-b border-line/70 bg-surface/60">
      <div
        class="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="max-w-md">
          <p class="flex items-center gap-3 text-sm font-extrabold tracking-wide text-brand">
            <span class="h-px w-8 bg-brand/40" aria-hidden="true" />
            {{ bulten.eyebrow }}
          </p>
          <p class="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
            {{ bulten.title }}
          </p>
          <p class="mt-1.5 text-sm leading-relaxed font-semibold text-soft">{{ bulten.sub }}</p>
        </div>
        <BultenForm source="footer" class="w-full sm:max-w-sm" />
      </div>
    </div>

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
      <div class="flex flex-col items-center gap-4">
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
        </nav>
        <!-- Dış profiller ikon sırası (kullanıcı kararı, 5 Ağu 2026);
             adres listesi ve sameAs uyarısı content.ts > footer.social'da. -->
        <SocialIcons />
      </div>
      <p class="text-sm font-bold text-muted">
        <span class="font-display text-base font-medium text-soft italic">{{ footer.signoff }}</span>
        · © {{ new Date().getFullYear() }} afiet
      </p>
    </div>
  </footer>
</template>

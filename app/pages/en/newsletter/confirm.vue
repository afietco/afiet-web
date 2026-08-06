<script setup lang="ts">
import { bultenEn } from '~/data/content.en'

/**
 * Çift onayın ikinci yarısı, İngilizce inişi: lang='en' kaydının onay
 * mailindeki bağlantı buraya düşer (TR karşılığı /bulten/onay). Token aynı
 * uçta doğrulanır; geçersiz/eskimiş token kendi cümlesini kurar ve yeniden
 * abone olma yolunu gösterir. Sayfa dizin dışıdır (noindex, seoDefaults).
 */
usePageSeo()

const route = useRoute()
const token = String(route.query.token ?? '')

const { data, error } = await useFetch<{ status?: string }>('/api/bulten/onay', {
  key: `bulten-onay:${token}`,
  method: 'POST',
  body: { token },
})
const ok = computed(() => !error.value && data.value?.status === 'confirmed')
</script>

<template>
  <div class="mx-auto max-w-2xl px-5 py-20 text-center sm:py-28">
    <div class="relative mx-auto h-24 w-24">
      <div
        class="pointer-events-none absolute top-1/2 left-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-brand/20 motion-safe:animate-[spin_60s_linear_infinite]"
        aria-hidden="true"
      />
      <AfiMascot class="absolute top-1/2 left-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 animate-float" />
    </div>

    <template v-if="ok">
      <h1 class="mt-9 font-display text-4xl font-semibold tracking-[-0.02em] text-ink">
        {{ bultenEn.confirmTitle }}
      </h1>
      <p class="mx-auto mt-4 max-w-md text-lg leading-relaxed font-semibold text-soft">
        {{ bultenEn.confirmBody }}
      </p>
      <NuxtLink to="/en" class="btn-primary mt-9">{{ bultenEn.backHome }}</NuxtLink>
    </template>

    <template v-else>
      <h1 class="mt-9 font-display text-4xl font-semibold tracking-[-0.02em] text-ink">
        {{ bultenEn.confirmFailTitle }}
      </h1>
      <p class="mx-auto mt-4 max-w-md text-lg leading-relaxed font-semibold text-soft">
        {{ bultenEn.confirmFailBody }}
      </p>
      <BultenForm source="en-confirm" lang="en" class="mx-auto mt-9 max-w-sm text-left" />
    </template>
  </div>
</template>

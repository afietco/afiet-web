<script setup lang="ts">
import { bultenEn } from '~/data/content.en'

/**
 * Tek tık çıkış, İngilizce inişi (TR karşılığı /bulten/cik): İngilizce
 * bültenin altındaki bağlantı buraya düşer. Token'ı bilinen herkes çıkabilir;
 * onay sorusu sorulmaz (fikrini değiştirenin önüne ikinci kapı koymak kayıp
 * draması olur, marka bunu yapmaz). Sayfa dizin dışıdır (noindex).
 */
usePageSeo()

const route = useRoute()
const token = String(route.query.token ?? '')

const { data, error } = await useFetch<{ status?: string }>('/api/bulten/cik', {
  key: `bulten-cik:${token}`,
  method: 'POST',
  body: { token },
})
const ok = computed(() => !error.value && data.value?.status === 'unsubscribed')
</script>

<template>
  <div class="mx-auto max-w-2xl px-5 py-20 text-center sm:py-28">
    <AfiMascot class="mx-auto h-20 w-20" />

    <template v-if="ok">
      <h1 class="mt-9 font-display text-4xl font-semibold tracking-[-0.02em] text-ink">
        {{ bultenEn.leaveTitle }}
      </h1>
      <p class="mx-auto mt-4 max-w-md text-lg leading-relaxed font-semibold text-soft">
        {{ bultenEn.leaveBody }}
      </p>
    </template>

    <template v-else>
      <h1 class="mt-9 font-display text-4xl font-semibold tracking-[-0.02em] text-ink">
        {{ bultenEn.confirmFailTitle }}
      </h1>
      <p class="mx-auto mt-4 max-w-md text-lg leading-relaxed font-semibold text-soft">
        The unsubscribe link looks incomplete or expired. You can use the link
        at the bottom of the latest newsletter, or write to us: destek@afiet.co
      </p>
    </template>

    <NuxtLink to="/en" class="btn-ghost mt-9">{{ bultenEn.backHome }}</NuxtLink>
  </div>
</template>

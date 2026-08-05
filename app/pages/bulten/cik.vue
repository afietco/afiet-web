<script setup lang="ts">
import { bulten } from '~/data/content'

/**
 * Tek tık çıkış: her bültenin altındaki bağlantı buraya düşer. Token'ı
 * bilinen herkes çıkabilir; onay sorusu sorulmaz (fikrini değiştirenin
 * önüne ikinci kapı koymak kayıp draması olur, marka bunu yapmaz).
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
        {{ bulten.leaveTitle }}
      </h1>
      <p class="mx-auto mt-4 max-w-md text-lg leading-relaxed font-semibold text-soft">
        {{ bulten.leaveBody }}
      </p>
    </template>

    <template v-else>
      <h1 class="mt-9 font-display text-4xl font-semibold tracking-[-0.02em] text-ink">
        {{ bulten.confirmFailTitle }}
      </h1>
      <p class="mx-auto mt-4 max-w-md text-lg leading-relaxed font-semibold text-soft">
        Çıkış bağlantısı eksik ya da eskimiş görünüyor. Son bültenin altındaki
        bağlantıyı kullanabilir ya da bize yazabilirsin: destek@afiet.co
      </p>
    </template>

    <NuxtLink to="/" class="btn-ghost mt-9">Ana sayfaya dön</NuxtLink>
  </div>
</template>

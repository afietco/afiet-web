<script setup lang="ts">
/**
 * Markalı hata sayfası. Asıl işi 404'ün GERÇEK 404 statüsüyle dönmesi:
 * eski deploy her yolu 200 + ana sayfa olarak dönüyordu (soft-404) ve
 * arama motorları için zehirliydi. Nuxt statüyü error.statusCode'dan basar.
 */
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)

useSeoMeta({
  title: () => (notFound.value ? 'Sayfa bulunamadı — afiet' : 'Bir şeyler ters gitti — afiet'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-canvas">
    <main class="flex flex-1 items-center justify-center px-5 py-24">
      <div class="max-w-md text-center">
        <AfiMascot class="mx-auto h-20 w-20" />
        <p class="mt-6 text-sm font-extrabold tracking-wide text-brand">
          {{ notFound ? '404' : String(error.statusCode) }}
        </p>
        <h1 class="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">
          {{ notFound ? 'Bu sofrada öyle bir sayfa yok' : 'Bir şeyler ters gitti' }}
        </h1>
        <p class="mt-3 font-semibold text-soft">
          {{
            notFound
              ? 'Aradığın sayfa taşınmış ya da hiç olmamış olabilir. Sofraya dönelim mi?'
              : 'Kusura bakma, bir aksilik oldu. Ana sayfadan devam edebilirsin.'
          }}
        </p>
        <button class="btn-primary mt-8" @click="clearError({ redirect: '/' })">
          Ana sayfaya dön
        </button>
      </div>
    </main>
  </div>
</template>

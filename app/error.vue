<script setup lang="ts">
/**
 * Markalı hata sayfası. Asıl işi 404'ün GERÇEK 404 statüsüyle dönmesi:
 * eski deploy her yolu 200 + ana sayfa olarak dönüyordu (soft-404) ve
 * arama motorları için zehirliydi. Nuxt statüyü error.statusCode'dan basar.
 *
 * Dil YOLDAN türer ve yolun kaynağı önemlidir: Nuxt bu bileşeni kendi
 * `/__nuxt_error` isteğiyle render eder, yani `useRequestURL()` kullanıcının
 * denediği yolu DEĞİL o dahili yolu verir (ölçüldü) ve /en altındaki her 404
 * Türkçe çıkardı. Doğru kaynak hatanın taşıdığı `url`; o yoksa router'ın
 * eşleşmeyen rotası da denenen yolu koruyor.
 */
import type { NuxtError } from '#app'
import { errorEn } from '~/data/content.en'
import { localeOf } from '#shared/utils/locales'

const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)
const attemptedPath = computed(() => {
  const url = String((props.error as NuxtError & { url?: string }).url ?? '')
  return url || useRoute().path
})
const en = computed(() => localeOf(attemptedPath.value) === 'en')
const home = computed(() => (en.value ? '/en' : '/'))

useSeoMeta({
  title: () => {
    if (en.value) return notFound.value ? errorEn.notFoundTitle : errorEn.errorTitle
    return notFound.value ? 'Sayfa bulunamadı | afiet' : 'Bir şeyler ters gitti | afiet'
  },
  robots: 'noindex, nofollow',
})

const title = computed(() => {
  if (en.value) return notFound.value ? errorEn.titleNotFound : errorEn.titleError
  return notFound.value ? 'Bu sofrada öyle bir sayfa yok' : 'Bir şeyler ters gitti'
})

const body = computed(() => {
  if (en.value) return notFound.value ? errorEn.bodyNotFound : errorEn.bodyError
  return notFound.value
    ? 'Aradığın sayfa taşınmış ya da hiç olmamış olabilir. Sofraya dönelim mi?'
    : 'Kusura bakma, bir aksilik oldu. Ana sayfadan devam edebilirsin.'
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
        <h1 class="mt-2 text-3xl font-black tracking-tight text-ink sm:text-4xl">{{ title }}</h1>
        <p class="mt-3 font-semibold text-soft">{{ body }}</p>
        <button class="btn-primary mt-8" @click="clearError({ redirect: home })">
          {{ en ? errorEn.cta : 'Ana sayfaya dön' }}
        </button>
      </div>
    </main>
  </div>
</template>

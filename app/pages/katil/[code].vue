<script setup lang="ts">
import { katil } from '~/data/content'

/**
 * Grup davet inişi: uygulamadaki GroupHome'un paylaştığı davet linkinin
 * (afiet.co/katil/{code}) karşılama noktası. afiet yüklüyse universal link
 * bağlantıyı doğrudan uygulamada açar ve bu sayfa hiç görünmez; bu sayfa
 * yalnız uygulama yokken ya da bağlantı masaüstü tarayıcıda açılınca görünür.
 * Bilinçli olarak panel dışıdır (usePageSeo yok): her koşulda noindex kalmalı,
 * sitemap'e girmemeli.
 */
useSeoMeta({
  title: 'Grup daveti | afiet',
  robots: 'noindex, nofollow',
})

const route = useRoute()

// Grup ID'si yol parametresidir: yalnız harf/rakam, büyük harf, 8 hane
// (backend'in kalıcı grup kodu biçimi). Geçersizse sakin uyarı gösterilir;
// SSR'da da bellidir (istemciye kalmaz).
const code = computed(() => {
  const raw = Array.isArray(route.params.code) ? route.params.code[0] : route.params.code
  return String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
})
const valid = computed(() => code.value.length === 8)

// Custom scheme: afiet yüklüyse uygulamayı açıp Grubum'a koda katılma akışını
// tetikler (bkz. afiet-mobile src/app/katil/[code].tsx).
const appLink = computed(() => `afiet://katil/${code.value}`)
</script>

<template>
  <div class="flex min-h-[70vh] items-center justify-center px-5 py-14 sm:py-20">
    <section class="w-full max-w-sm rounded-3xl border border-line bg-surface p-7 text-center shadow-lift sm:p-9">
      <AfiMascot class="mx-auto h-14 w-14" />
      <p class="mt-3 text-2xl font-extrabold tracking-tight text-brand">afiet</p>

      <!-- GEÇERLİ: davet kartı + kod + uygulamada aç -->
      <template v-if="valid">
        <p class="mt-6 text-xs font-bold tracking-wide text-muted uppercase">{{ katil.eyebrow }}</p>
        <h1 class="mt-1 text-2xl font-extrabold tracking-tight text-ink">{{ katil.title }}</h1>
        <p class="mt-2 text-[15px] leading-relaxed text-soft">{{ katil.sub }}</p>

        <!-- Kod büyük gösterilir: elle "ID ile katıl"da da girilebilsin -->
        <div class="mt-6 rounded-2xl bg-brand-mint/30 px-5 py-5">
          <p class="text-[11px] font-bold tracking-wide text-brand-ink/70 uppercase">
            {{ katil.codeLabel }}
          </p>
          <p class="mt-1 text-3xl font-extrabold text-brand-ink sm:text-4xl" style="letter-spacing: 0.28em">
            {{ code }}
          </p>
        </div>

        <a :href="appLink" class="btn-primary mt-6 w-full">{{ katil.openApp }}</a>
        <p class="mt-3 text-sm leading-relaxed text-muted">{{ katil.openHint }}</p>

        <div class="mt-8 border-t border-line pt-6">
          <h2 class="text-base font-extrabold tracking-tight text-ink">{{ katil.noAppTitle }}</h2>
          <p class="mt-2 text-[15px] leading-relaxed text-soft">{{ katil.noAppBody }}</p>
          <div class="mt-5">
            <StoreBadges size="lg" />
          </div>
        </div>
      </template>

      <!-- GEÇERSİZ: kod eksik / hatalı biçim -->
      <div v-else class="mt-6">
        <h1 class="text-xl font-extrabold tracking-tight text-ink">{{ katil.invalidTitle }}</h1>
        <p class="mt-2 text-[15px] leading-relaxed text-soft">{{ katil.invalidBody }}</p>
      </div>
    </section>
  </div>
</template>

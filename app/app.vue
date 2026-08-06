<script setup lang="ts">
import { siteEn } from '~/data/content.en'

// Atlama bağlantısı sayfanın dilinde konuşur; gerisi iki dilde aynı iskelet.
const { locale } = useSiteLocale()
</script>

<template>
  <div class="relative min-h-screen overflow-x-clip">
    <a
      href="#icerik"
      class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:font-bold focus:text-white"
    >
      {{ locale === 'en' ? siteEn.skipLink : 'İçeriğe atla' }}
    </a>
    <SiteHeader />
    <main id="icerik">
      <NuxtPage />
    </main>
    <SiteFooter />
    <CookieNotice />
  </div>
</template>

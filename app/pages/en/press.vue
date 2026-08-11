<script setup lang="ts">
import { pressEn } from '~/data/content.en'

/**
 * İngilizce basın kiti (/en/press): gövde BasinKiti bileşeninde, kopya
 * content.en.ts > pressEn'de. Yabancı basına verilen adres budur; Türkçe
 * sayfa gönderilmez.
 */
usePageSeo()
</script>

<template>
  <BasinKiti :copy="pressEn" lang="en" />
</template>

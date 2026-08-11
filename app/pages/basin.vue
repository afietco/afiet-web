<script setup lang="ts">
import { basin } from '~/data/content'

/**
 * Basın kiti: tüm gövde BasinKiti bileşenindedir (İngilizce /en/press ile
 * paylaşılır); bu dosya yalnız TR kopyayı bağlar.
 */
usePageSeo()
</script>

<template>
  <BasinKiti :copy="basin" lang="tr" />
</template>

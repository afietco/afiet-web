<script setup lang="ts">
import { aboutEn } from '~/data/content.en'

/**
 * İngilizce yazar sayfası (/en/about): gövde HakkindaSayfasi bileşeninde,
 * kopya content.en.ts > aboutEn'de. İngilizce blog yazılarının künyesi buraya
 * bağlanır; kimlik (Person @id) iki dilde de aynıdır, yalnız anlatım çevrilir.
 */
usePageSeo()
</script>

<template>
  <HakkindaSayfasi :copy="aboutEn" lang="en" />
</template>

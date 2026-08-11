<script setup lang="ts">
import { hakkinda } from '~/data/content'

/**
 * Yazar sayfası: tüm gövde HakkindaSayfasi bileşenindedir (İngilizce
 * /en/about ile paylaşılır); bu dosya yalnız TR kopyayı bağlar.
 *
 * Bu sayfa blog ve destek yazılarındaki Person şemasının ADRESİDİR
 * (shared/utils/author.ts). Yolu değişirse author.ts, EN_BY_TR ve
 * seoDefaults'taki sayfa kaydı birlikte değişir.
 */
usePageSeo()
</script>

<template>
  <HakkindaSayfasi :copy="hakkinda" lang="tr" />
</template>

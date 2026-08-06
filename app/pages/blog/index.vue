<script setup lang="ts">
import { blog } from '~/data/content'

/**
 * Türkçe blog listesi. Gövde `BlogListe` bileşenindedir (/en/blog ile
 * paylaşılır); bu dosya yalnız TR kopyayı ve dili bağlar.
 * Meta/canonical panelden yönetilir (varsayılanlar kodda - seoDefaults.ts).
 */
usePageSeo()
</script>

<template>
  <BlogListe :copy="blog" lang="tr" />
</template>

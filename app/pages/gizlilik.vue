<script setup lang="ts">
import { privacy } from '~/data/content'

/**
 * Gizlilik politikası: gövde PrivacyArticle bileşenindedir (İngilizce
 * /en/privacy ile paylaşılır); bu dosya yalnız TR kopyayı bağlar.
 * Meta/canonical panelden yönetilir (varsayılanlar kodda - seoDefaults.ts).
 */
usePageSeo()
</script>

<template>
  <PrivacyArticle :copy="privacy" />
</template>

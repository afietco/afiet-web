<script setup lang="ts">
import { hesapSil } from '~/data/content'

/**
 * Hesap silme: gövde DeleteAccountArticle bileşenindedir (İngilizce
 * /en/delete-account ile paylaşılır); bu dosya yalnız TR kopyayı bağlar.
 * Meta/canonical panelden yönetilir (varsayılanlar kodda - seoDefaults.ts).
 */
usePageSeo()
</script>

<template>
  <DeleteAccountArticle :copy="hesapSil" />
</template>

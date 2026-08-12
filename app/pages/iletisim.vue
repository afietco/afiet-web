<script setup lang="ts">
import { iletisim } from '~/data/content'

/**
 * İletişim sayfası: tüm gövde KartpostalIletisim bileşenindedir (İngilizce
 * /en/contact ile paylaşılır); bu dosya yalnız TR kopyayı bağlar.
 * Meta/canonical panelden yönetilir (varsayılanlar kodda - seoDefaults.ts).
 */
usePageSeo()
</script>

<template>
  <KartpostalIletisim :copy="iletisim" lang="tr" />
</template>

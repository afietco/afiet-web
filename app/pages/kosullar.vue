<script setup lang="ts">
import { terms } from '~/data/content'

/**
 * Kullanım Koşulları: gövde TermsArticle bileşenindedir; bu dosya yalnız TR
 * kopyayı bağlar. İngilizce karşılığı YOK, o yüzden EN_BY_TR'ye satır
 * eklenmedi (çevirisi olmayan sayfaya /en yolu açılmaz).
 * Meta/canonical panelden yönetilir (varsayılanlar kodda - seoDefaults.ts).
 */
usePageSeo()
</script>

<template>
  <TermsArticle :copy="terms" />
</template>

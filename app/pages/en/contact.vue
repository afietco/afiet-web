<script setup lang="ts">
import { contactEn } from '~/data/content.en'

/**
 * İngilizce iletişim (/en/contact): kartpostal gövdesi KartpostalIletisim
 * bileşeninde, kopya content.en.ts > contactEn'de. Mesajlar TR sayfayla aynı
 * uca (POST /api/iletisim) düşer; ekip kutusuna dilinde gelir.
 */
usePageSeo()
</script>

<template>
  <KartpostalIletisim :copy="contactEn" lang="en" />
</template>

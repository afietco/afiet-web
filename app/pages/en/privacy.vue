<script setup lang="ts">
import { privacyEn } from '~/data/content.en'

/**
 * İngilizce gizlilik politikası (/en/privacy): TR politikanın (content.ts >
 * privacy) çevirisidir ve onunla İÇERİK olarak senkron tutulur; TR metin
 * değişirse content.en.ts > privacyEn de değişir.
 */
usePageSeo()
</script>

<template>
  <PrivacyArticle :copy="privacyEn" />
</template>

<script setup lang="ts">
import { blogEn } from '~/data/content.en'

/**
 * İngilizce blog listesinin ikinci ve sonraki sayfaları: `/en/blog/page/2`.
 * Türkçe ikizi `app/pages/blog/sayfa/[sayfa].vue`; gerekçe orada.
 */
const route = useRoute()
const istenenSayfa = computed(() => Number(route.params.page))

usePageSeo()
</script>

<template>
  <BlogListe :copy="blogEn" lang="en" :istenen-sayfa="istenenSayfa" />
</template>

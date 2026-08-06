<script setup lang="ts">
import { blogEn } from '~/data/content.en'

/**
 * İngilizce blog listesi (/en/blog). Gövde `BlogListe` bileşeninde.
 *
 * İngilizce yazı yokken sayfa "ilk yazı fırında" durumunu gösterir ama
 * sitemap'e, menüye ve llms.txt'ye GİRMEZ (kullanıcı kararı, 6 Ağu 2026):
 * içi boş bir liste sayfası indekslenmemeli. Koşullar sırasıyla
 * `sitemap.xml.get.ts`, `SiteHeader/SiteFooter` ve `llms.txt.get.ts` içinde.
 */
usePageSeo()
</script>

<template>
  <BlogListe :copy="blogEn" lang="en" />
</template>

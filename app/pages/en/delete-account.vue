<script setup lang="ts">
import { deleteAccountEn } from '~/data/content.en'

/**
 * İngilizce hesap silme (/en/delete-account): content.ts > hesapSil'in
 * karşılığı. Mağaza gereksinimi olan adres iki dilde de erişilebilirdir.
 */
usePageSeo()
</script>

<template>
  <DeleteAccountArticle :copy="deleteAccountEn" />
</template>

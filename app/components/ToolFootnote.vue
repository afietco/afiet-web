<script setup lang="ts">
import { toolsEn } from '~/data/content.en'

/**
 * İngilizce hesap sayfalarının altındaki iki cümle (TR'deki `HesapAltBilgi`nin
 * karşılığı): tıbbi olmayan uyarı ve gizlilik. Gizlilik cümlesi bir vaat:
 * hesap tarayıcıda koşar, hiçbir değer sunucuya gitmez. Sayfalardan biri bunu
 * bozarsa bu bileşen yalan söyler.
 */
defineProps<{ hasResult?: boolean }>()
</script>

<template>
  <div class="mt-8">
    <p v-if="hasResult" class="text-sm leading-relaxed text-muted">{{ toolsEn.disclaimer }}</p>
    <p class="mt-2 text-sm leading-relaxed text-muted">{{ toolsEn.privacy }}</p>
  </div>
</template>

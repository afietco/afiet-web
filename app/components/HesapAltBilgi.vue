<script setup lang="ts">
import { hesapla } from '~/data/content'

/**
 * Her hesap sayfasının altında duran iki cümle: tıbbi olmayan uyarı ve
 * gizlilik. Gizlilik cümlesi bir vaat: hesap tarayıcıda koşar, hiçbir değer
 * sunucuya gitmez. Sayfalardan biri bunu bozarsa bu bileşen yalan söyler.
 */
defineProps<{ sonucVar?: boolean }>()
</script>

<template>
  <div class="mt-8">
    <p v-if="sonucVar" class="text-sm leading-relaxed text-muted">{{ hesapla.disclaimer }}</p>
    <p class="mt-2 text-sm leading-relaxed text-muted">{{ hesapla.privacy }}</p>
  </div>
</template>

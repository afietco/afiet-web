<script setup lang="ts">
import type { DestekIkonAdi } from '#shared/types/destek'

/**
 * Destek kategorilerinin el çizimi ikonları (currentColor). ZagIcon ile aynı
 * dil: 24'lük kare, 1.8 kalınlık, yuvarlak uç, dolgu yerine kontur.
 */
defineProps<{ name: DestekIkonAdi }>()
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    class="h-7 w-7"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- filiz: topraktan çıkan iki yapraklı sap - başlangıç -->
    <template v-if="name === 'filiz'">
      <path d="M12 20v-7" />
      <path d="M12 13c0-3 2-4.6 4.6-4.8C16.4 11 14.8 13 12 13z" />
      <path d="M12 15c-2.5 0-4-1.5-4.2-4C10.3 11.2 11.8 12.6 12 15z" opacity="0.45" />
      <path d="M6.5 20h11" />
    </template>

    <!-- kase ve kaşık: öğün kaydının ölçü dili -->
    <template v-else-if="name === 'kase'">
      <path d="M3.2 11h14a7 7 0 0 1-14 0z" />
      <path d="M5.6 15.4A7 7 0 0 0 14.6 15.4" opacity="0.4" />
      <ellipse cx="19.6" cy="7.4" rx="1.7" ry="2.4" />
      <path d="M19.6 9.8V17" />
    </template>

    <!-- fotoğraf makinesi: Afi'nin yemeği tanıması (ZagIcon 'afi' ile aynı) -->
    <template v-else-if="name === 'afi'">
      <path d="M3.5 8.5h3l1.6-2.3h7.8L17.5 8.5h3v10.5h-17z" />
      <circle cx="12" cy="13.5" r="3.4" />
      <circle cx="12" cy="13.5" r="1.3" fill="currentColor" stroke="none" opacity="0.3" />
    </template>

    <!-- yay üzerinde beş nokta: denge ve ritim -->
    <template v-else-if="name === 'ritim'">
      <circle cx="4" cy="13" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="6" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.6" fill="currentColor" stroke="none" opacity="0.3" />
      <circle cx="20" cy="13" r="1.6" fill="currentColor" stroke="none" opacity="0.3" />
      <path d="M7 17.5q5 4 10 0" />
    </template>

    <!-- ortak sofra: iki kişi, aralarında masa -->
    <template v-else-if="name === 'sofra'">
      <circle cx="8" cy="7.2" r="2.4" />
      <circle cx="16" cy="7.2" r="2.4" opacity="0.45" />
      <path d="M3.5 14.5h17" />
      <path d="M5.5 14.5v4.5M18.5 14.5v4.5" opacity="0.45" />
      <path d="M9.6 12.3a5 5 0 0 1 4.8 0" />
    </template>

    <!-- kalkan: hesap ve veri -->
    <template v-else-if="name === 'kalkan'">
      <path d="M12 3.2l7 2.8v5.1c0 4.4-2.9 7.5-7 9-4.1-1.5-7-4.6-7-9V6z" />
      <path d="M9.2 12.1l2 2 3.6-3.9" opacity="0.55" />
    </template>

    <!-- pusula: yolunu bulmak, sorun giderme -->
    <template v-else-if="name === 'pusula'">
      <circle cx="12" cy="12" r="8.4" />
      <path d="M15.2 8.8l-1.9 4.5-4.5 1.9 1.9-4.5z" opacity="0.55" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </template>
  </svg>
</template>

<script setup lang="ts">
/**
 * Sonuç satırı: solda renk şeridi, ortada BÜYÜK değer, sağda etiket.
 * Değerin büyük, etiketin küçük olması bilinçli; okunan şey değerdir.
 */
defineProps<{ deger: string; etiket: string; renk: string; zemin: string }>()
</script>

<template>
  <li class="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4">
    <span class="h-9 w-1.5 shrink-0 rounded-full" :class="zemin" aria-hidden="true" />
    <span class="font-display text-2xl font-semibold text-ink">{{ deger }}</span>
    <span class="ml-auto text-right font-extrabold" :class="renk">{{ etiket }}</span>
  </li>
</template>

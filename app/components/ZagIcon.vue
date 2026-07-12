<script setup lang="ts">
/** Zag kartlarının el çizimi duotone ikonları (currentColor). */
defineProps<{ name: 'denge' | 'sofra' | 'aile' | 'sefkat' }>()
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
    <!-- beş grup, yay üzerinde — üçü dolu, denge tamamlanıyor -->
    <template v-if="name === 'denge'">
      <circle cx="4" cy="13" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="8" cy="7.8" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="5.8" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="16" cy="7.8" r="1.7" fill="currentColor" stroke="none" opacity="0.3" />
      <circle cx="20" cy="13" r="1.7" fill="currentColor" stroke="none" opacity="0.3" />
      <path d="M7 17.5q5 4 10 0" />
    </template>

    <!-- ekmek dilimi + iç dilim çizgisi -->
    <template v-else-if="name === 'sofra'">
      <path d="M4 19v-5.5a8 8 0 0 1 16 0V19z" />
      <path d="M7.5 19v-5a4.5 4.5 0 0 1 9 0v5" opacity="0.35" />
    </template>

    <!-- iki büyük bir küçük: aile -->
    <template v-else-if="name === 'aile'">
      <circle cx="7" cy="7.5" r="2.6" />
      <circle cx="17" cy="7.5" r="2.6" />
      <circle cx="12" cy="10.5" r="2.1" fill="currentColor" stroke="none" opacity="0.3" />
      <path d="M2.8 19a4.4 4.4 0 0 1 8.4-1.4" />
      <path d="M12.8 17.6A4.4 4.4 0 0 1 21.2 19" />
      <path d="M9.4 19.5a2.8 2.8 0 0 1 5.2 0" />
    </template>

    <!-- kalp, içinde Afi'nin gülümsemesi -->
    <template v-else>
      <path d="M12 20.5S3.8 15.4 2.8 10.6a4.6 4.6 0 0 1 8.4-3.4L12 8.6l.8-1.4a4.6 4.6 0 0 1 8.4 3.4C20.2 15.4 12 20.5 12 20.5z" />
      <path d="M9.4 11.6q2.6 2.3 5.2 0" opacity="0.5" />
    </template>
  </svg>
</template>

<script setup lang="ts">
/** Uygulama henüz mağazalarda değil; rozetler "yakında" bilgisi taşır. */
defineProps<{ size?: 'sm' | 'lg' }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-3" :class="size === 'lg' ? 'justify-center' : ''">
    <span
      v-for="store in ['App Store', 'Google Play']"
      :key="store"
      class="flex items-center gap-2.5 rounded-2xl border border-line bg-surface text-left"
      :class="size === 'lg' ? 'px-5 py-3' : 'px-4 py-2'"
    >
      <svg
        v-if="store === 'App Store'"
        viewBox="0 0 24 24"
        class="text-ink"
        :class="size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 7c-4 0-6.5 3-6.5 6.5 0 3 2 6.5 4 6.5 1.2 0 1.6-.7 2.5-.7s1.3.7 2.5.7c2 0 4-3.5 4-6.5C18.5 10 16 7 12 7z" />
        <path d="M12 7c0-2 1.5-3.5 3-4" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        class="text-ink"
        :class="size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 4.5v15l12-7.5z" />
      </svg>
      <span class="leading-tight">
        <span class="block text-[10px] font-bold tracking-wide text-muted uppercase">Yakında</span>
        <span class="block font-extrabold" :class="size === 'lg' ? 'text-base' : 'text-sm'">
          {{ store }}
        </span>
      </span>
    </span>
  </div>
</template>

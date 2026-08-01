<script setup lang="ts">
/**
 * Hesaplama formlarının sayı alanı. Türkçe klavyede ondalık virgülle yazılır;
 * ayrıştırma `#shared/hesap/girdi` içinde, ikisi de kabul edilir.
 */
const model = defineModel<string>({ required: true })
defineProps<{ label: string; birim?: string; ornek?: string }>()
</script>

<template>
  <label class="block">
    <span class="text-sm font-extrabold text-soft">
      {{ label }}<template v-if="birim"> ({{ birim }})</template>
    </span>
    <input
      v-model="model"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :placeholder="ornek"
      class="mt-1.5 w-full rounded-2xl border border-line bg-canvas px-4 py-3 text-lg font-bold text-ink transition placeholder:font-normal placeholder:text-muted focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none"
    />
  </label>
</template>

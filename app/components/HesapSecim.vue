<script setup lang="ts">
/** Hap biçiminde tek seçimlik grup (cinsiyet gibi kısa listeler için). */
const model = defineModel<string>({ required: true })
defineProps<{ label: string; secenekler: { key: string; label: string }[] }>()
</script>

<template>
  <fieldset>
    <legend class="text-sm font-extrabold text-soft">{{ label }}</legend>
    <div class="mt-2 flex flex-wrap gap-2">
      <label
        v-for="s in secenekler"
        :key="s.key"
        class="cursor-pointer rounded-full border px-5 py-2.5 font-bold transition"
        :class="
          model === s.key
            ? 'border-brand bg-brand text-white shadow-lift'
            : 'border-line bg-canvas text-soft hover:border-brand/40'
        "
      >
        <input v-model="model" type="radio" :value="s.key" class="sr-only" />
        {{ s.label }}
      </label>
    </div>
  </fieldset>
</template>

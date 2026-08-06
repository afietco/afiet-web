<script setup lang="ts">
import { toolsEn } from '~/data/content.en'
import type { UnitSystem } from '#shared/hesap/birim'

/**
 * İngilizce hesaplayıcıların birim seçici hapı. Durum `useUnitSystem`
 * içindedir (useState + localStorage), yani araçlar arasında hatırlanır ve
 * dört sayfa aynı tercihi paylaşır.
 *
 * Görünüm `HesapSecim` ile aynı olurdu ama o bileşen `string` modeli tutuyor;
 * burada model daraltılmış bir birlik tipi olduğu için hap kendi içinde basılır.
 */
const { system } = useUnitSystem()
</script>

<template>
  <fieldset>
    <legend class="text-sm font-extrabold text-soft">{{ toolsEn.unitsLabel }}</legend>
    <div class="mt-2 flex flex-wrap gap-2">
      <label
        v-for="option in toolsEn.unitOptions"
        :key="option.key"
        class="cursor-pointer rounded-full border px-5 py-2.5 font-bold transition"
        :class="
          system === option.key
            ? 'border-brand bg-brand text-white shadow-lift'
            : 'border-line bg-canvas text-soft hover:border-brand/40'
        "
      >
        <input
          v-model="system"
          type="radio"
          :value="(option.key as UnitSystem)"
          class="sr-only"
        />
        {{ option.label }}
      </label>
    </div>
  </fieldset>
</template>

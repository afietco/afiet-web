<script setup lang="ts">
import { askAfi } from '~/data/content'

/**
 * "Afi'ye sor" bölümü. FaqSection'ın İÇİNDE değil, index.vue'da KARDEŞİ olarak
 * durur - çünkü `faq` üç ayrı durumda null olur (panelden "ana sayfada göster"
 * kapatılınca, liste boşalınca, yol kök değilken) ve panelin en çok işe
 * yaradığı an tam da SSS'nin görünmediği andır. FaqSection.vue'nun "JS'siz
 * çalışır, içerik HTML'de kalır" sözleşmesi de böylece hiç kırılmaz.
 *
 * NUXT_PUBLIC_ASK_API_URL boşken bölüm hiç render edilmez; bu sayede bu iş
 * üretimi görsel olarak değiştirmeden main'e merge edilebilir. 'mock' değeri
 * backend olmadan paneli çalışır gösterir.
 */
const props = defineProps<{ attached?: boolean }>()

const config = useRuntimeConfig()
const enabled = computed(() => String(config.public.askApiUrl || '') !== '')
</script>

<template>
  <section
    v-if="enabled"
    id="afiye-sor"
    class="scroll-mt-20"
    :aria-labelledby="props.attached ? 'afiye-sor-giris' : 'afiye-sor-baslik'"
  >
    <div class="mx-auto max-w-6xl px-5" :class="props.attached ? 'pt-2 pb-24' : 'py-24'">
      <!-- SSS listesi yukarıdaysa ikinci bir başlık koymayız, tek satır davet yeter -->
      <p
        v-if="props.attached"
        id="afiye-sor-giris"
        v-reveal
        class="mx-auto mb-6 max-w-2xl text-center font-semibold text-soft"
      >
        {{ askAfi.attachedLead }}
      </p>

      <div v-else class="mx-auto mb-12 max-w-2xl text-center">
        <p v-reveal class="text-sm font-extrabold tracking-wide text-brand">
          {{ askAfi.eyebrow }}
        </p>
        <h2
          id="afiye-sor-baslik"
          v-reveal="80"
          class="mt-3 text-4xl font-black tracking-tight text-ink sm:text-5xl"
        >
          {{ askAfi.title }}
        </h2>
      </div>

      <div v-reveal="120">
        <AskAfiPanel />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * SSS bölümü — içerik panelden (SEO & GEO > Yapısal veri & SSS) yönetilir ve
 * aynı maddeler FAQPage JSON-LD olarak da basılır (usePageSeo). Boşken sayfa
 * bu bileşeni hiç render etmez. Native <details>: JS'siz çalışır, içerik
 * HTML'de kalır (GEO botları JS çalıştırmadan okur).
 */
defineProps<{
  faq: { title: string; intro: string; items: { q: string; a: string }[] }
}>()
</script>

<template>
  <section id="sss" class="scroll-mt-20" aria-labelledby="sss-baslik">
    <div class="mx-auto max-w-6xl px-5 py-24">
      <div class="mx-auto max-w-2xl text-center">
        <p v-reveal class="text-sm font-extrabold tracking-wide text-brand">Sorular</p>
        <h2
          id="sss-baslik"
          v-reveal="80"
          class="mt-3 text-4xl font-black tracking-tight text-ink sm:text-5xl"
        >
          {{ faq.title }}
        </h2>
        <p v-if="faq.intro" v-reveal="140" class="mt-4 font-semibold text-soft">
          {{ faq.intro }}
        </p>
      </div>

      <div class="mx-auto mt-12 flex max-w-2xl flex-col gap-3.5">
        <details
          v-for="(item, i) in faq.items"
          :key="item.q"
          v-reveal="i * 60"
          class="faq-item group rounded-[22px] border border-line bg-surface transition hover:border-brand/30"
        >
          <summary
            class="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-extrabold tracking-tight text-ink [&::-webkit-details-marker]:hidden"
          >
            <span>{{ item.q }}</span>
            <svg
              class="faq-chevron h-5 w-5 shrink-0 text-brand transition-transform duration-300"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 8l5 5 5-5"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </summary>
          <p class="px-6 pb-6 leading-relaxed font-semibold text-soft">{{ item.a }}</p>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.faq-item[open] .faq-chevron {
  transform: rotate(180deg);
}
.faq-item[open] {
  box-shadow: var(--shadow-lift);
}
</style>

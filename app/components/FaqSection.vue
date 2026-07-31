<script setup lang="ts">
/**
 * SSS bölümü - içerik panelden (SEO & GEO > Yapısal veri & SSS) yönetilir ve
 * aynı maddeler FAQPage JSON-LD olarak da basılır (usePageSeo). Boşken sayfa
 * bu bileşeni hiç render etmez. Native <details>: JS'siz çalışır, içerik
 * HTML'de kalır (GEO botları JS çalıştırmadan okur).
 */
defineProps<{
  faq: { title: string; intro: string; items: { q: string; a: string; href?: string }[] }
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
          class="mt-3 font-display text-4xl font-semibold tracking-[-0.015em] text-ink sm:text-5xl"
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
            <span
              class="faq-chevron flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-brand transition duration-300 group-hover:bg-brand-mint/40"
              aria-hidden="true"
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 8l5 5 5-5"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </summary>
          <div class="px-6 pb-6">
            <p class="leading-relaxed font-semibold text-soft">{{ item.a }}</p>
            <!-- Ayrıntılı anlatım destek merkezinde; SSS kısa cevabı verir,
                 aynı metni iki yerde tekrar etmeyiz. Bağlantı isteğe bağlıdır
                 (panelden yönetilir), yoksa madde eskisi gibi görünür. -->
            <NuxtLink
              v-if="item.href"
              :to="item.href"
              class="mt-3 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand transition hover:text-brand-deep"
            >
              Ayrıntılı anlatım
              <svg
                class="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </NuxtLink>
          </div>
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

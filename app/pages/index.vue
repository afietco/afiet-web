<script setup lang="ts">
// Ana sayfa (vitrin). Bölümler app.vue'dan buraya taşındı ki pages/ yönlendirmesi
// çalışsın; header/footer app.vue'da paylaşılır. Bileşenler Nuxt'ta oto-import.
// Meta + JSON-LD + SSS içeriği panelden yönetilir (usePageSeo → /api/seo/meta).
const { faq } = usePageSeo()
</script>

<template>
  <HeroSection />
  <ZagSection />
  <VoiceSection />
  <FaqSection v-if="faq" :faq="faq" />
  <CtaSection />
</template>

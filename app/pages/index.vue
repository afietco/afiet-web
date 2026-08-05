<script setup lang="ts">
// Ana sayfa (vitrin). Bölümler app.vue'dan buraya taşındı ki pages/ yönlendirmesi
// çalışsın; header/footer app.vue'da paylaşılır. Bileşenler Nuxt'ta oto-import.
// Meta + JSON-LD + SSS içeriği panelden yönetilir (usePageSeo → /api/seo/meta).
const { faq } = usePageSeo()
</script>

<template>
  <HeroSection />
  <!-- Son sürüm şeridi: hero'nun hemen altında ince duyuru; sürüm yoksa görünmez. -->
  <YeniliklerBand />
  <ZagSection />
  <VoiceSection />
  <HesaplaSection />
  <BlogSection />
  <!-- Afi'ye sor: SSS'nin ÜSTÜNDE kendi başlığıyla durur; SSS boşken de görünür. -->
  <AskAfiSection />
  <FaqSection v-if="faq" :faq="faq" />
  <CtaSection />
</template>

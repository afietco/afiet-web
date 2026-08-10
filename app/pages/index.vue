<script setup lang="ts">
// Ana sayfa (vitrin). Bölümler app.vue'dan buraya taşındı ki pages/ yönlendirmesi
// çalışsın; header/footer app.vue'da paylaşılır. Bileşenler Nuxt'ta oto-import.
// Meta + JSON-LD + SSS içeriği panelden yönetilir (usePageSeo → /api/seo/meta).
import { homeBlog } from '~/data/content'

const { faq } = usePageSeo()
</script>

<template>
  <HeroSection />
  <ZagSection />
  <!-- Son sürüm şeridi: "Neden afiet?"in altında ince duyuru (kullanıcı kararı,
       5 Ağu 2026: hero'nun hemen altı fazla öndeydi); sürüm yoksa görünmez. -->
  <YeniliklerBand />
  <VoiceSection />
  <HesaplaSection />
  <BlogSection :copy="homeBlog" lang="tr" />
  <!-- Afi'ye sor: SSS'nin ÜSTÜNDE kendi başlığıyla durur; SSS boşken de görünür. -->
  <AskAfiSection />
  <FaqSection v-if="faq" :faq="faq" />
  <CtaSection />
</template>

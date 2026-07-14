<script setup lang="ts">
// Ana sayfa (vitrin). Bölümler app.vue'dan buraya taşındı ki pages/ yönlendirmesi
// çalışsın; header/footer app.vue'da paylaşılır. Bileşenler Nuxt'ta oto-import.
const SITE_URL = 'https://afiet.co'
useHead({ link: [{ rel: 'canonical', href: `${SITE_URL}/` }] })
</script>

<template>
  <HeroSection />
  <ZagSection />
  <VoiceSection />
  <CtaSection />
</template>

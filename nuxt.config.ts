import tailwindcss from '@tailwindcss/vite'

const SITE_URL = 'https://afiet.co'
const TITLE = 'afiet — Sayma, dengele.'
const DESCRIPTION =
  'Kalori saydırmadan, Türk sofrasının kendi ölçüleriyle — dilim, kase, avuç — ' +
  'ailece dengeli beslenme alışkanlığı. Yakında App Store ve Google Play’de.'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-12',
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },

  // Tek sayfalık statik vitrin: rota build'de HTML'e döner (SEO + ilk boya hızı).
  nitro: {
    prerender: { routes: ['/'], crawlLinks: true },
    compressPublicAssets: true,
  },

  runtimeConfig: {
    public: {
      // Bekleme listesi kayıt endpoint'i (env: NUXT_PUBLIC_WAITLIST_ENDPOINT).
      // Boşken form "çok yakında" modunda; backend hazır olunca doldurulur.
      waitlistEndpoint: '',
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'tr' },
      title: TITLE,
      meta: [
        { name: 'description', content: DESCRIPTION },
        { name: 'theme-color', content: '#fdfaf3' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'afiet' },
        { property: 'og:locale', content: 'tr_TR' },
        { property: 'og:title', content: TITLE },
        { property: 'og:description', content: DESCRIPTION },
        { property: 'og:url', content: `${SITE_URL}/` },
        { property: 'og:image', content: `${SITE_URL}/og.png` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
      link: [
        { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'canonical', href: `${SITE_URL}/` },
      ],
    },
  },
})

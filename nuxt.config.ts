import tailwindcss from '@tailwindcss/vite'

const TITLE = 'afiet — Sayma, dengele.'
const DESCRIPTION =
  'Kalori saydırmadan, Türk sofrasının kendi ölçüleriyle — dilim, kase, avuç — ' +
  'ailece dengeli beslenme alışkanlığı. Yakında App Store ve Google Play’de.'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-12',
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },

  // SEO/GEO panelden yönetilir (afiet-admin → /api/admin/seo → Neon).
  // Sayfalar bu yüzden build'de dondurulmaz; swr ile istekte render edilip
  // 60 sn cache'lenir (Vercel'de ISR'a çevrilir) — panel değişikliği en geç
  // 1-2 dakikada canlıya yansır, ilk boya hızı edge cache sayesinde korunur.
  // robots.txt / sitemap.xml / llms.txt dinamik server route'larıdır.
  routeRules: {
    '/': { swr: 60 },
    '/gizlilik': { swr: 60 },
    '/hesap-sil': { swr: 60 },
  },

  nitro: {
    compressPublicAssets: true,
  },

  runtimeConfig: {
    // Neon connection string (server-side, gizli). Env: NUXT_DATABASE_URL.
    // Boşken /api/waitlist "soon" döner, SEO uçları kod varsayılanlarını sunar
    // ve admin yazma uçları 503 döner — çalışmayan form/panel yayınlanmaz.
    databaseUrl: '',
    // Panel (afiet-admin) istekleri için JWT doğrulama — backend'in
    // AUTH_JWKS_URL / AUTH_ISSUER / AUTH_AUDIENCE değerlerinin aynısı.
    adminJwksUrl: '',
    adminIssuer: '',
    adminAudience: '',
    // Virgüllü admin e-posta allowlist'i (backend ADMIN_EMAILS ile aynı).
    adminEmails: '',
    // YALNIZ `nuxt dev`te geçerli bypass token'ı (production'da kod ölü).
    adminDevToken: '',
    // Panelin origin'leri (virgüllü) — /api/admin/** CORS izni.
    adminCorsOrigins: '',
  },

  app: {
    head: {
      htmlAttrs: { lang: 'tr' },
      // Aşağısı yalnızca son çare fallback'tir: her sayfa usePageSeo ile
      // panelden yönetilen meta setini basar (og/twitter/canonical dahil).
      title: TITLE,
      meta: [
        { name: 'description', content: DESCRIPTION },
        { name: 'theme-color', content: '#fdfaf3' },
      ],
      link: [
        { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
})

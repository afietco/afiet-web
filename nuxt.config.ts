import tailwindcss from '@tailwindcss/vite'

const TITLE = 'afiet | Sayma, dengele.'
const DESCRIPTION =
  'Kalori saydırmadan, Türk sofrasının kendi ölçüleriyle (dilim, kase, avuç) ' +
  'ailece dengeli beslenme alışkanlığı. Beta şimdi açık; App Store ve Google Play yakında.'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-12',
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },

  // SEO/GEO panelden yönetilir (afiet-admin → /api/admin/seo → Neon).
  // Sayfalar build'de dondurulmaz; Vercel-native ISR (isr: 60) ile istekte
  // render edilip 60 sn'de bir tazelenir - panel değişikliği en geç 1-2
  // dakikada canlıya yansır. NOT: `swr: 60` Vercel'de hiç revalidate
  // etmiyordu (sayfalar ~30 saat tek render'dan servis edildi, 15 Tem
  // tespiti) - isr'a bu yüzden geçildi, swr'a geri dönme.
  // robots.txt / sitemap.xml / llms.txt dinamik server route'larıdır.
  routeRules: {
    '/': { isr: 60 },
    // İngilizce sayfalar (/en/*): TR'yle aynı ISR penceresi. Kapsam bilinçli
    // olarak dardır; hangi sayfaların EN karşılığı olduğu
    // shared/utils/locales.ts > EN_BY_TR'de durur.
    '/en': { isr: 60 },
    '/en/**': { isr: 60 },
    '/beta': { isr: 60 },
    '/blog': { isr: 60 },
    '/blog/**': { isr: 60 },
    '/gizlilik': { isr: 60 },
    '/hesap-sil': { isr: 60 },
    // Basın kiti: içerik neredeyse hiç değişmez, meta yine panelden yönetilir.
    '/basin': { isr: 60 },
    // Durum sayfası ve API'si: 60 sn tazelik yeterli (cron 5 dk'da bir yazar).
    '/durum': { isr: 60 },
    '/api/status': { isr: 60 },
    // Sürüm kapısı: her mobil açılışta okunuyor, kararı günler ölçeğinde bir
    // bilgi. Yine de zorunlu bir güncelleme yayına alındığında bir dakikadan
    // fazla beklemesin diye pencere diğerleriyle aynı.
    '/api/app-version': { isr: 60 },
    // Destek merkezi: içerik repoda (deploy ile değişir), yine de meta panelden
    // yönetilebilsin diye diğer sayfalarla aynı ISR penceresi.
    '/destek': { isr: 60 },
    '/destek/**': { isr: 60 },
    // Sürüm notları: içerik repoda (deploy ile değişir), destekle aynı pencere.
    '/yenilikler': { isr: 60 },
    '/yenilikler/**': { isr: 60 },
    // Hesaplama araçları: form SSR'da basılır, hesap TAMAMEN tarayıcıda koşar.
    '/hesapla': { isr: 60 },
    '/hesapla/**': { isr: 60 },
    // Universal link doğrulama dosyası (public/.well-known/…): uzantısı
    // olmadığından statik sunum content-type belirleyemez; Apple bunu
    // application/json ile bekler (iOS eşleştirmeyi buradan yapar).
    '/.well-known/apple-app-site-association': {
      headers: { 'content-type': 'application/json' },
    },
  },

  nitro: {
    compressPublicAssets: true,
    /* Vercel fonksiyon tavanı. Varsayılan 10 saniyedir ve indeks taraması
       (/api/cron/gsc-index) onu aşar: her tur onlarca URL'i Google'ın URL
       Inspection ucundan tek tek sorar. Tavan bir REZERVASYON değil sınırdır,
       yani hızlı istekler bundan etkilenmez. Nitro'nun Vercel preset'i tüm
       sunucu route'larını tek fonksiyonda topladığı için ayar geneldir. */
    vercel: { functions: { maxDuration: 60 } },
    // Destek merkezi yazıları veritabanında DEĞİL repoda yaşar; sunucu paketine
    // asset olarak gömülür ve `useStorage('assets:destek')` ile okunur
    // (server/utils/supportStore.ts). Yol nitro.srcDir'e (yani `server/`) görelidir.
    serverAssets: [
      { baseName: 'destek', dir: '../content/destek' },
      // Sürüm notları da aynı yolu izler (server/utils/releaseStore.ts).
      { baseName: 'yenilikler', dir: '../content/yenilikler' },
      // Hesaplama araçlarının uzun içeriği (server/utils/hesaplaStore.ts).
      { baseName: 'hesapla', dir: '../content/hesapla' },
    ],
  },

  runtimeConfig: {
    // Neon connection string (server-side, gizli). Env: NUXT_DATABASE_URL.
    // Boşken /api/beta/apply "soon" döner, SEO uçları kod varsayılanlarını sunar
    // ve admin yazma uçları 503 döner - çalışmayan form/panel yayınlanmaz.
    databaseUrl: '',
    // Panel (afiet-admin) istekleri için JWT doğrulama - backend'in
    // AUTH_JWKS_URL / AUTH_ISSUER / AUTH_AUDIENCE değerlerinin aynısı.
    adminJwksUrl: '',
    adminIssuer: '',
    adminAudience: '',
    // Virgüllü admin e-posta allowlist'i (backend ADMIN_EMAILS ile aynı).
    adminEmails: '',
    // YALNIZ `nuxt dev`te geçerli bypass token'ı (production'da kod ölü).
    adminDevToken: '',
    // Panelin origin'leri (virgüllü) - /api/admin/** CORS izni.
    adminCorsOrigins: '',
    // "Afi'ye sor" bileti: backend'in ASK_TICKET_SECRET'ıyla AYNI değer olmak
    // zorunda, yoksa imza tutmaz. Boşken /api/afi/ticket 503 'soon' döner ve
    // panel "çok yakında" moduna geçer. Env: NUXT_ASK_TICKET_SECRET.
    askTicketSecret: '',
    // Biletin hedeflediği backend ortamı; backend'in APP_ENV'iyle aynı olmalı
    // (development | staging | production). Preview biletinin prod'da
    // geçmemesini bu alan sağlar. Env: NUXT_ASK_ENV.
    askEnv: '',
    // ── Sosyal hesaplar / otomatik ölçüm (Faz 2) ──────────────────────────
    // Instagram uygulama kimlikleri (Meta app > Instagram API with Instagram
    // Login). BOŞ = bağlama akışı kapalı, panel bunu rozetle söyler ve takvim
    // çalışmaya devam eder. Env: NUXT_IG_APP_ID / NUXT_IG_APP_SECRET.
    igAppId: '',
    igAppSecret: '',
    // Meta'ya KAYITLI redirect_uri; tek bir adres olmak zorunda, o yüzden
    // bağlama akışı yalnız production'da çalışır:
    // https://afiet.co/api/social/instagram/callback
    igRedirectUri: '',
    // Erişim token'larını DB'de şifrelemek için 32 baytlık base64 anahtar
    // (Secret Manager: app-social-token-key). BOŞ = hesap bağlama 503 döner;
    // yarım şifreleme yapılmaz. Env: NUXT_SOCIAL_TOKEN_KEY.
    socialTokenKey: '',
    // Cloud Scheduler'ın /api/cron/* uçlarına verdiği X-Cron-Secret başlığı.
    // BOŞ = cron uçları 503 (yanlışlıkla açık kalmasın). Env: NUXT_CRON_SECRET.
    cronSecret: '',
    // Go backend'in /api/internal/* uçlarına verdiği X-Internal-Secret
    // başlığı (içerik hattı: blog yayını + takvim önerileri). BOŞ = iç uçlar
    // 503, cronSecret ile aynı ilke. Ortam başına AYRI değer (backend'de
    // app-<ortam>-web-internal-secret). Env: NUXT_INTERNAL_API_SECRET.
    internalApiSecret: '',
    // İçerik takvimi ekleri (gs://afiet-icerik): imzalı yükleme/indirme.
    // Anahtar Secret Manager'daki `app-content-gcs-key`in base64'ü (ham JSON
    // da kabul edilir). BOŞ = ek yükleme kapalı, panel bunu rozetle söyler ve
    // takvimin geri kalanı çalışmaya devam eder. Env: NUXT_GCS_SA_KEY.
    gcsSaKey: '',
    gcsBucket: 'afiet-icerik',
    // Resend API anahtarı (posta.afiet.co): yeni beta başvurusunda ekibe
    // bildirim maili atılır. Boşken mail hiç denenmez, başvuru etkilenmez.
    // Env: NUXT_RESEND_API_KEY.
    resendApiKey: '',
    // Google Search Console okuma servis hesabı (Secret Manager:
    // app-gsc-sa-key, base64 JSON; ham JSON da kabul). BOŞ = GSC senkronu 503,
    // panel "bağlantı kurulmadı" gösterir. SA e-postası GSC mülküne elle
    // kullanıcı olarak eklenmiş olmalı. Env: NUXT_GSC_SA_KEY.
    gscSaKey: '',
    // Search Console mülkü. Domain mülkü biçimi: sc-domain:afiet.co.
    // Env: NUXT_GSC_PROPERTY.
    gscProperty: 'sc-domain:afiet.co',

    public: {
      // Analitik beacon'ının çalışacağı production host'ları (virgüllü).
      // Yalnız burada toplar; dev/preview/staging boş kalır ki paylaşılan
      // Neon kirlenmesin. Env: NUXT_PUBLIC_ANALYTICS_DOMAINS.
      analyticsDomains: 'afiet.co,www.afiet.co',
      // "Afi'ye sor" panelinin konuştuğu backend ucu (Go API, Cloud Run).
      // BOŞ = bölüm hiç render edilmez, üretim görsel olarak değişmez.
      // 'mock' = backend olmadan sahte akışla çalışır (yerel geliştirme + smoke).
      // Env: NUXT_PUBLIC_ASK_API_URL.
      askApiUrl: '',
      // Cloudflare Turnstile SİTE anahtarı. Gizli değildir, HTML'e basılır;
      // secret yalnız backend'de (TURNSTILE_SECRET) durur ve doğrulama orada
      // yapılır. BOŞ = Turnstile hiç yüklenmez, panel çalışmaya devam eder
      // (dev, preview ve smoke Cloudflare'e erişmeden koşsun diye).
      // Env: NUXT_PUBLIC_TURNSTILE_SITE_KEY.
      turnstileSiteKey: '',
    },
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

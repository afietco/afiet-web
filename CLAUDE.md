# afiet-web

afiet.co tanıtım sitesi (landing). Uygulama yalnızca native mobilde yaşar —
bu sitede uygulamaya/PWA'ya link verilmez; CTA'lar store rozetleri ("yakında")
ve bekleme listesidir. UI dili tamamen Türkçe.

Marka rehberi: `../afiet-mobile/BRAND.md` — isim HER YERDE küçük harf "afiet"
(cümle başında bile; `uppercase` sınıfı isme asla değmez), tagline
"Sayma, dengele.", ses tonu "sofrada seni seven biri" (sen dili, yargı yok).

## Stack ve yapı

- Nuxt 4 + Tailwind v4 (`@tailwindcss/vite`); sayfalar `routeRules` swr:60 ile
  istekte SSR + cache (Vercel'de ISR) — SEO meta'sı panelden değiştirilebilsin
  diye build'de dondurulmaz (statik prerender'ın yerini aldı)
- Tasarım tokenları ve animasyonlar: `app/assets/css/main.css` (@theme) —
  sayfa bilinçli olarak tek temadır (açık/krem "sıcak sofra"); dark mode yok
- Tüm metin içeriği: `app/data/content.ts` — kopya değişikliği bileşene dokunmaz
- Bileşenler `app/components/` altında bölüm başına tektir (SiteHeader, HeroSection,
  PhoneMock, ZagSection, VoiceSection, CtaSection, WaitlistForm, SiteFooter…)
- `v-reveal` direktifi (`app/plugins/reveal.ts`) scroll'da `.is-in` ekler;
  hero'daki açılış animasyonu `.rise` sınıfıyla CSS'te
- Afi maskotu `AfiMascot.vue` — buhar telleri hep İKİ tanedir, yüz ifadesi sabittir
  (BRAND.md > Logo); `public/icon.svg` ile birlikte değişir
- Bekleme listesi: `server/api/waitlist.post.ts` (Nitro) → Neon `waitlist` tablosu
  (`@neondatabase/serverless`, tablo kendi kendini kurar — CREATE TABLE IF NOT EXISTS +
  ON CONFLICT). E-posta doğrulama + honeypot (`company` alanı) + kaynak etiketi.
  Connection string `NUXT_DATABASE_URL` (runtimeConfig.databaseUrl, server-side).
  `WaitlistForm.vue` durum makinesi: idle→sending→done/exists/soon/error, başarıda
  konfetili kutlama. Backend'in AYNI Neon'una yazar ama golang-migrate şemasından
  ayrı tablo (landing'e ait).

## SEO & GEO (panelden yönetilir)

- Model: kod varsayılanları (`server/utils/seoDefaults.ts` — bugünkü davranışın
  birebir kaydı) + Neon'daki override'lar (`seo_settings`/`seo_pages`/
  `seo_redirects`, waitlist gibi kendi kendini kurar). Boş DB = varsayılanlar;
  "varsayılana dön" = satırı sil. Efektif birleşim: `server/utils/seoStore.ts`
  (60 sn bellek cache; her admin yazımı cache'i VE swr sayfa cache'ini düşürür).
- Sayfalar `usePageSeo()` composable'ı ile `/api/seo/meta?path=`ten meta çeker
  (title/description/og/twitter/canonical/robots/doğrulama kodları/JSON-LD).
  Elle `useHead` meta bloğu YAZMA — panel yönetimini kırar.
- JSON-LD: ana sayfada Organization+WebSite+SoftwareApplication grafiği +
  (doluysa) FAQPage. SSS maddeleri hem görünür bölüm (`FaqSection.vue`, boşsa
  render edilmez) hem şemadır — ikisi hep aynı kaynaktan gelir.
- Dinamik route'lar: `/robots.txt` (AI bot izinleri panelden; varsayılan liste
  `seoDefaults.ts > AI_BOTS`, Bytespider engelli), `/sitemap.xml`, `/llms.txt`.
  `public/robots.txt` bilinçli olarak YOK. Yönlendirmeler:
  `server/middleware/redirects.ts` (tam yol eşleşmesi, panelden).
- Panel = afiet-admin reposundaki "SEO & GEO" ekranı; `/api/admin/seo*` uçlarına
  kullanıcının Stack/Neon Auth JWT'siyle gelir. Doğrulama `server/utils/
  adminAuth.ts`: JWKS+issuer+audience (backend'in AUTH_* değerlerinin aynısı,
  env: `NUXT_ADMIN_*`) ve backend'le aynı kural (roles 'admin' VEYA
  NUXT_ADMIN_EMAILS). Yerel geliştirmede `NUXT_ADMIN_DEV_TOKEN` bypass'ı yalnız
  `nuxt dev`te çalışır. CORS: `server/middleware/admin-cors.ts`.
- Vercel env kurulumu: `bash scripts/vercel-env-setup.sh` (değerleri gcloud
  Secret Manager + .env'den okur; production dahil).
- 404 artık gerçektir (`app/error.vue`, markalı) — eski deploy'daki "her yol
  200 + ana sayfa" soft-404 davranışına geri dönme.

## Blog & içerik planı (panelden + Claude ile)

- Veri modeli: `server/utils/contentStore.ts` — `content_items` (panel içerik
  planı), `blog_posts` (yazılar; runtime kaynağı DB'dir), `content_metrics`
  (elle girilen ölçümler). SEO tabloları gibi kendi kendini kurar; tipler
  `contentTypes.ts` ↔ afiet-admin `src/services/content.ts` BİREBİR aynadır.
- Panel uçları: `/api/admin/content*` (GET/PUT/DELETE — `requireAdmin`,
  503 `db_bagli_degil`, 422 `gecersiz_alan:<alan>`, yazmalar taze payload döner).
- Public: `/blog` + `/blog/[slug]` (routeRules isr:60) `/api/blog/posts*`ten
  beslenir; gövde sunucuda **markdown-it `html:false`** ile render edilir —
  ham HTML escape edilir, `html: true`'ya ÇEVİRME (v-html güvenliği buna dayalı).
  Yazı meta'sı/JSON-LD'si (BlogPosting + BreadcrumbList) `seoStore.resolvePageMeta`
  içinde üretilir; panelin `seo_pages['/blog/<slug>']` override'ı üstüne biner.
  Sitemap yayındaki yazıları otomatik ekler; RSS: `/blog/rss.xml`.
- Yayınlama (deploy YOK): panel prompt'u → Claude Code yazıyı
  `content/posts/<slug>.md`e yazar → onay → `node scripts/publish-post.mjs
  content/posts/<slug>.md` (Neon host'u gösterip onay ister; upsert + bağlı
  panel içeriğini "yayında" yapar). Görünürlük: sayfa ≤ ~2 dk, sitemap/RSS ≤ 5 dk.
  Yayından kaldırma: `--unpublish <slug>`. md dosyaları sürümlü YEDEKTİR;
  script'teki DDL `contentStore.ts` ile senkron tutulur.

## Komutlar

- `npm run dev` / `build` / `preview`
- `npm run typecheck` — vue-tsc
- `npm run smoke` — build sonrası gerçek Chrome doğrulaması (`scripts/smoke.mjs`);
  bu Mac'te sistem Chrome'u, CI'da `CHROME_PATH`
- `npm run assets` — `public/og.png` ve `public/favicon.ico`'yu yeniden üretir
  (`scripts/generate-assets.mjs`)

## Bilinen tuhaflıklar

- devDependencies'teki `commander` bizim kodumuz için değil: svgo@4'ün
  (nuxt → cssnano zinciri) opsiyonel peer'ı; npm bunu lock'a yazmayı atlıyor
  ve CI'da `npm ci` senkron hatası veriyor. Kaldırmadan önce `npm ci --dry-run`
  ile doğrula.
- CI bilinçli olarak `npm ci` DEĞİL `npm install` kullanır: npm, platforma göre
  atlanan opsiyonelleri (tailwind oxide wasm zinciri, @emnapi/*) lock'a eksik
  yazabiliyor (npm/cli#4828) ve `npm ci` linux'ta düşüyor. `npm ci`ya geri
  dönmeden önce CI'ın üç dalda da yeşil olduğunu görmeden merge etme.

## Kurallar

- Bekleme listesi Neon'a `NUXT_DATABASE_URL` ile yazar (yukarı bkz.); boşken route
  503 'soon' döner, form "çok yakında" moduna geçer. Çalışmayan form yayınlanmaz.
- Dal modeli: `feature/*` → `development` → `staging` → `main`
  (`afiet-mobile/docs/BRANCHING.md`). `main` = Vercel production.
- Her anlamlı değişiklikten sonra: `npm run build && npm run smoke`.
- Emoji yalnızca mesaj metinlerinde/avatarlarda; ikon gereken yerde inline SVG.

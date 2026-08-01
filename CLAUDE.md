# afiet-web

afiet.co tanıtım sitesi (landing). Uygulama yalnızca native mobilde yaşar -
bu sitede uygulamaya/PWA'ya link verilmez; CTA'lar store rozetleri ("yakında")
ve /beta başvurusudur. UI dili tamamen Türkçe.

Marka rehberi: `../afiet-mobile/BRAND.md` - isim HER YERDE küçük harf "afiet"
(cümle başında bile; `uppercase` sınıfı isme asla değmez), tagline
"Sayma, dengele.", ses tonu "sofrada seni seven biri" (sen dili, yargı yok).

## Stack ve yapı

- Nuxt 4 + Tailwind v4 (`@tailwindcss/vite`); sayfalar `routeRules` swr:60 ile
  istekte SSR + cache (Vercel'de ISR) - SEO meta'sı panelden değiştirilebilsin
  diye build'de dondurulmaz (statik prerender'ın yerini aldı)
- Tasarım tokenları ve animasyonlar: `app/assets/css/main.css` (@theme) -
  sayfa bilinçli olarak tek temadır (açık/krem "sıcak sofra"); dark mode yok
- Tüm metin içeriği: `app/data/content.ts` - kopya değişikliği bileşene dokunmaz
- Bileşenler `app/components/` altında bölüm başına tektir (SiteHeader, HeroSection,
  PhoneMock, ZagSection, VoiceSection, CtaSection, BetaForm, SiteFooter…)
- `v-reveal` direktifi (`app/plugins/reveal.ts`) scroll'da `.is-in` ekler;
  hero'daki açılış animasyonu `.rise` sınıfıyla CSS'te
- Afi maskotu `AfiMascot.vue` - buhar telleri hep İKİ tanedir, yüz ifadesi sabittir
  (BRAND.md > Logo); `public/icon.svg` ile birlikte değişir
- `public/bimi/afi.svg` - e-posta istemcilerinde gönderen avatarı (BIMI). DNS'teki
  `default._bimi.posta.afiet.co` kaydı bu URL'i gösterir, yani DOSYA YOLU SABİT
  KALMALI, taşınırsa avatar düşer. SVG Tiny P/S profili: `baseProfile="tiny-ps"`,
  `<title>` zorunlu, kare viewBox, script/animasyon/dış referans yasak. Kaynağı
  `afiet-brand/logo/afi-icon.svg`, marka logosu değişirse bu da elle yenilenir.
- Beta başvurusu: `server/api/beta/apply.post.ts` (Nitro) → Neon
  `beta_applications` tablosu (`@neondatabase/serverless`; DDL'in TEK kaynağı
  `server/utils/betaStore.ts`). E-posta doğrulama + honeypot (`company` alanı) +
  ZORUNLU açık rıza (KVKK). Aynı e-posta yeniden başvurursa yanıtlar güncellenir.
  Connection string `NUXT_DATABASE_URL` (runtimeConfig.databaseUrl, server-side).
  `BetaForm.vue` çok adımlı: e-posta → seni tanıyalım → alışkanlıkların.
  Kilo/kalori/sayı SORULMAZ (marka gereği). Okuma: `GET /api/admin/beta`.
  Landing'de başka e-posta toplama noktası yok; eski bekleme listesi
  (`waitlist` tablosu + formu) 27 Tem 2026'da kaldırıldı.

## Veritabanı: her ortam kendi Neon branch'i

`NUXT_DATABASE_URL` ortam başına AYRIDIR ve backend'in kullandığı secret'ın
aynısıdır (`app-<ortam>-database-url`, gcloud Secret Manager):

| Vercel ortamı | Neon branch | kaynak secret |
|---|---|---|
| production (`main`) | production | `app-prod-database-url` |
| preview (`staging`) | staging | `app-staging-database-url` |
| preview (`development`) | development | `app-dev-database-url` |
| yerel `nuxt dev` | development | repodaki `.env` |

Yani web'in kendi kendini kuran tabloları (`seo_*`, `blog_posts`,
`content_items`, `content_metrics`, `beta_applications`, `analytics_events`)
üç Neon branch'inde de ayrı ayrı yaşar, backend'in golang-migrate şemasının
yanında. Dev ve staging'de bu tablolar BOŞ başlar: SEO kod varsayılanlarına
düşer, `/blog` boş listelenir - bu bir arıza değil.

Prod'a yazan tek akış blog yayınıdır ve BİLİNÇLİ olmalıdır; yerel `.env` artık
development'ı gösterdiği için prod URL'i tek seferlik verilir:

```
NUXT_DATABASE_URL="$(cat .env.prod-url)" node scripts/publish-post.mjs content/posts/<slug>.md
```

## SEO & GEO (panelden yönetilir)

- Model: kod varsayılanları (`server/utils/seoDefaults.ts` - bugünkü davranışın
  birebir kaydı) + Neon'daki override'lar (`seo_settings`/`seo_pages`/
  `seo_redirects`, beta tablosu gibi kendi kendini kurar). Boş DB = varsayılanlar;
  "varsayılana dön" = satırı sil. Efektif birleşim: `server/utils/seoStore.ts`
  (60 sn bellek cache; her admin yazımı cache'i VE swr sayfa cache'ini düşürür).
- Sayfalar `usePageSeo()` composable'ı ile `/api/seo/meta?path=`ten meta çeker
  (title/description/og/twitter/canonical/robots/doğrulama kodları/JSON-LD).
  Elle `useHead` meta bloğu YAZMA - panel yönetimini kırar.
- JSON-LD: ana sayfada Organization+WebSite+SoftwareApplication grafiği +
  (doluysa) FAQPage. SSS maddeleri hem görünür bölüm (`FaqSection.vue`, boşsa
  render edilmez) hem şemadır - ikisi hep aynı kaynaktan gelir.
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
- Vercel env kurulumu: `bash scripts/vercel-env-setup.sh` (tüm değerleri gcloud
  Secret Manager'dan okur; production dahil).
- 404 artık gerçektir (`app/error.vue`, markalı) - eski deploy'daki "her yol
  200 + ana sayfa" soft-404 davranışına geri dönme.

## Blog & içerik takvimi (panelden + Claude ile)

- Veri modeli: `server/utils/contentStore.ts` - `content_items` (takvim
  etkinlikleri), `blog_posts` (yazılar; runtime kaynağı DB'dir),
  `content_metrics` (ölçümler), `content_attachments` (indirilebilir ekler).
  SEO tabloları gibi kendi kendini kurar; tipler `contentTypes.ts` ↔
  afiet-admin `src/services/content.ts` BİREBİR aynadır.
- **Şema büyürken:** tablolar prod'da veriyle yaşıyor, `CREATE TABLE IF NOT
  EXISTS` yetmez. `ensureContentTables` eklemeli ALTER'ları da koşar
  (`ADD COLUMN IF NOT EXISTS` + adlandırılmış CHECK'i düşür/ekle). Kolon SİLME
  ya da tip daraltma yapılmaz. Platform/biçim listesi büyüyünce DB CHECK'i ile
  `contentTypes.ts > CHANNELS / CONTENT_FORMATS` HEP birlikte değişir (yoksa
  panel sessiz 400/422 alır).
- Etkinlik iki eksenlidir: `channel` = platform (blog | instagram | x | tiktok |
  youtube; DB kolon adı tarihsel olarak "channel", UI'da "platform" yazar) ve
  `format` (yazi | reel | carousel | story | post | shorts | video). Hangi
  platformda hangi biçim geçerli: `FORMATS_BY_CHANNEL` (doğrulama + UI aynı
  listeyi okur).
- Zaman: `planned_at timestamptz` + `all_day` tek gerçektir; `planned_date`
  geriye uyum için türetilip yazılmaya devam eder. Takvim **Europe/Istanbul**
  duvar saatinde çalışır (`CONTENT_TZ`), tarayıcının yereli kullanılmaz.
- Panel uçları: `/api/admin/content*` (GET/PUT/DELETE - `requireAdmin`,
  503 `db_bagli_degil`, 422 `gecersiz_alan:<alan>`, yazmalar taze payload döner).
  Sürükle-bırak için ayrı `PUT /api/admin/content/move` (yalnız zamanı taşır,
  diğer alanları ezmez).
- **Ekler (Google Cloud Storage):** kova `gs://afiet-icerik` (europe-west1,
  herkese açık erişim KAPALI, lifecycle silme YOK, ortamlar `prod/ staging/
  dev/` prefix'iyle ayrılır). Dosya sunucudan GEÇMEZ: `POST .../attachment`
  imzalı PUT bileti verir, panel doğrudan kovaya yükler, `PUT .../attachment`
  nesneyi HEAD'le doğrulayıp satırı `hazir` yapar. Sebep: Vercel'in ~4.5MB
  gövde sınırı reel videolarını taşımaz. İndirme kalıcı URL değildir,
  `GET .../attachment-url` 15 dakikalık imza üretir.
  İmzalama `server/utils/gcsSign.ts`: **bağımlılık yok**, Web Crypto ile V4
  (repoda @types/node yok, `node:crypto` kullanma). Sunucu HEAD/DELETE için de
  kendine imza atar, OAuth token takası hiç yok.
  Anahtar: Secret Manager `app-content-gcs-key` → `NUXT_GCS_SA_KEY` (base64).
  Servis hesabı `content-storage@afiet-co` yalnız bu kovada objectAdmin. BOŞ
  anahtar = yükleme kapalı, takvimin geri kalanı çalışır (`storageReady:false`).
  Kova CORS'unda yeni bir panel origin'i yoksa tarayıcı yüklemesi preflight'ta
  düşer (`gcloud storage buckets update --cors-file`).
- Public: `/blog` + `/blog/[slug]` (routeRules isr:60) `/api/blog/posts*`ten
  beslenir; gövde sunucuda **markdown-it `html:false`** ile render edilir -
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

## Destek merkezi (/destek)

- **İçerik REPODA yaşar, veritabanında DEĞİL:** `content/destek/<kategori>/<slug>.md`.
  Nitro `serverAssets` ile sunucu paketine gömülür (`nuxt.config > nitro`),
  `useStorage('assets:destek')` ile okunur. Yani dokümantasyon ürünle birlikte
  sürümlenir, PR'da gözden geçirilir ve development/staging'de de DOLUDUR
  (blogun aksine). Yayına almak = commit + deploy.
- Kategori seti kodda: `server/utils/supportCategories.ts` (7 kategori, aksan
  renkleri uygulamadaki besin grubu renkleridir; son iki kategori bilinçli
  nötrdür). **Kategori slug'ı yayınlandıktan sonra DEĞİŞTİRİLMEZ.**
- Okuma katmanı `server/utils/supportStore.ts`: frontmatter (blogdaki
  `publish-post.mjs` sözleşmesinin aynısı), markdown-it `html:false`,
  h2/h3'lere id + içindekiler, arama dizini, llms çıktıları. Bellekte cache'li;
  üretimde dosyalar değişmediği için süresizdir, `nuxt dev`te her istekte tazelenir.
- Gövdeye özel üç çitli blok: ```` ```ipucu ````, ```` ```dikkat ````, ```` ```yol ````
  (uygulama içi gezinme satırı). Kırmızı uyarı kutusu YOK, marka kırmızıyı
  uyarı dili olarak kullanmıyor. Sıralı liste her zaman ADIM listesidir
  (numara rozeti); blogdaki gömme büyük harf burada kullanılmaz.
- Tipler `shared/types/support.ts`, Türkçe katlama `shared/utils/turkish.ts` -
  ikisi de sunucu VE istemci için tek kaynaktır. Katlama iki tarafta ayrışırsa
  arama sessizce yanlış çalışır.
- **Arama tamamen istemcide:** dizin (`/api/destek/arama`) kutuya ilk
  odaklanmada bir kez inilir. Skorlama başlık > özet > ara başlık/anahtar
  kelime > gövde. İki Türkçe kuralı gömülüdür: aksan katlama ("olcu" → "ölçü")
  ve ünsüz yumuşaması ("grup" → "gruba"). Bir yazının listeye girmesi için
  sorgunun en az bir kelimesini KÜRATÖRLÜ bir alanda taşıması gerekir; yalnız
  gövdede geçmek yetmez (yoksa "grup" araması "besin grubu" geçen her yazıyı
  döker). Sonuç yoksa soru Afi paneline devredilir.
- Sayfalar: `/destek` (hub), `/destek/[kategori]`, `/destek/[kategori]/[slug]`
  (üç kolon: sol ağaç, gövde, sağ "Bu sayfada"). Meta `usePageSeo` ile
  panelden yönetilir; kategori sayfaları `DEFAULT_PAGES`ta üretilir, yazı
  meta'sı `seoStore.resolvePageMeta` içinde frontmatter'dan türetilir.
  Şema: hub/kategori `CollectionPage`, yazı `TechArticle` + `BreadcrumbList`.
  **HowTo bilinçli olarak kullanılmıyor** (Google zengin sonucu kaldırdı,
  markdown'dan güvenilir adım nesnesi üretmek uydurma yapıya davetiye).
- `/llms-full.txt` tüm destek gövdesini düz metin verir; `/llms.txt`'nin destek
  bölümü panelden değil KODDAN üretilir (elle güncellenen liste eskir).
- Ölçüm: "Bu yazı yardımcı oldu mu?" oyu ve SONUÇSUZ arama sorgusu birinci
  taraf analitiğe yazılır (`analytics_events.event` = `destek_oy` /
  `destek_arama`, değer `title` kolonunda). Sayfa görüntülemeyle AYNI KVKK
  onayı kapısından geçer (`$afietEvent`, analitik eklentisi). Gizlilik metninde
  karşılığı vardır.
- Destek merkezi masaüstü üst menüde YOKTUR (kullanıcı kararı): giriş kapıları
  alt bilgi, mobil menü, ana sayfadaki SSS maddelerinin `href`leri ve arama
  motorlarıdır.
- Ekran görüntüsü: `node scripts/support-shots.mjs` (build sonrası, `.shots/`).

## Sürüm notları (/yenilikler)

- **İçerik REPODA yaşar:** `content/yenilikler/<sürüm>.md`, destek merkeziyle
  aynı yol (Nitro `serverAssets` → `useStorage('assets:yenilikler')`,
  `server/utils/releaseStore.ts`). Yayına almak = commit + deploy.
- Kaynak mobil changelog'dur: `node scripts/surum-notu-taslagi.mjs 0.10.1`
  `../afiet-mobile/apps/mobile/CHANGELOG.md`ten o sürümün maddelerini alıp
  emojisine göre gruplar (✨ Yenilikler / 🔧 İyileştirmeler / 🐛 Düzeltmeler)
  ve üç `TODO` satırı bırakır: başlık, özet, giriş paragrafı. Maddeler
  YENİDEN YAZILMAZ, yalnız bakım diline kaçan yerler cilalanır.
- **TODO kalırsa dosya yayına çıkmaz** (`releaseStore` atlar): yarım bir sayfa
  yayınlamaktansa hiç görünmemesi tercih edilir. Sürüm/tarih frontmatter'dan
  okunur, dosya adından türetilmez; biçimi tutmayan dosya da atlanır.
- Sürüm sırası sözlük sırası DEĞİLDİR (`compareVersions`): "0.9.0" > "0.10.0"
  olurdu ve en yeni sürüm listenin ortasına düşerdi.
- Bilinmeyen sürüm markalı hata sayfasına düşmez, kendi cümlesini kurar ve
  yanıt 404'tür. O ekranın içeriği ÇEKİLEN VERİYE BAĞLI OLAMAZ: 404 dönen bir
  belgede istemci hidrasyonda sunucunun payload'ını kullanmıyor, sunucuda
  basılan liste ilk render'da boşalıp uyumsuzluk üretiyordu. Uç bu yüzden 200
  + `release: null` döner, 404'ü sayfa kurar.
- Bu sayfa uygulamanın "Yenilikler" alt sayfasının uzun hâlidir ve pop-up
  `afiet.co/yenilikler/<sürüm>` adresine bağlanır: **ilgili sürüm mağazaya
  çıkmadan önce yayında olmak zorundadır** (afiet-mobile `/release` akışının
  3. adımı bunu şart koşar).
- Meta/şema `seoStore.resolvePageMeta` içinde frontmatter'dan türetilir
  (TechArticle + BreadcrumbList); sitemap ve llms.txt bölümleri otomatiktir.

## Sosyal hesaplar & otomatik ölçüm (Faz 2)

- Model: `server/utils/socialStore.ts` - `social_accounts` (bağlı hesap +
  ŞİFRELİ token) ve `social_posts` (platformdan çekilen gönderi; takvim
  etkinliğine `item_id` ile bağlanır). Tipler `socialTypes.ts` ↔ afiet-admin
  `src/services/social.ts` BİREBİR aynadır.
- **Instagram yolu:** "Instagram API with Instagram Login"
  (`graph.instagram.com`), izinler `instagram_business_basic` +
  `instagram_business_manage_insights`. **Kendi hesabımız için App Review
  GEREKMEZ**: hesap Meta uygulamasında tester/developer rolündeyse Standard
  Access yeter.
- Bağlama akışı: panel `GET /api/admin/social/instagram-start` ile imzalı
  `state` içeren authorize adresini alır → kullanıcı izin verir → Meta
  `GET /api/social/instagram/callback`e döner (bu uç PUBLIC olmak zorunda;
  güvenlik `state` HMAC'i + 10 dk ömür). Token uzun ömürlüye çevrilip
  AES-256-GCM ile şifrelenerek saklanır (`socialCrypto.ts`,
  `NUXT_SOCIAL_TOKEN_KEY`). Meta'ya kayıtlı redirect TEK adres olduğu için
  bağlama **yalnız production'da** çalışır.
- **Ölçüm webhook'u YOK** (hiçbir platform vermiyor): `POST /api/cron/social-metrics`
  günde bir çalışır (Cloud Scheduler `app-social-metrics-prod`, 06:00
  Europe/Istanbul, `X-Cron-Secret` = `NUXT_CRON_SECRET`). Cron: token bitişine
  20 günden az kaldıysa yeniler → son 25 gönderiyi çeker → eşleştirir →
  eşleşenlerin insight'larını `content_metrics`e (source `instagram`) yazar.
  Meta 90 günden eskisini vermediği için anlık görüntüyü almazsak geçmiş
  kaybolur; tarih başına tek satır (`UNIQUE (item_id, metric_date)`).
- Eşleştirme SADECE `platform_post_id` ya da `published_url` = permalink ile
  yapılır; caption benzerliğine BAKILMAZ (yanlış eşleşme eşleşmemekten kötü).
  Eşleşmeyen gönderi panelde listelenir, tek tıkla bağlanır
  (`PUT /api/admin/social/link`).
- Metrik adları v22.0 sonrasıdır: `views, reach, likes, comments, saved,
  shares, total_interactions`. `impressions` ve `video_views` KALDIRILDI, geri
  ekleme. Story'de `saved` yok, o yüzden metrik seti biçime göre daralır ve
  hata olursa `views,reach`e düşerek yeniden dener.
- Token/sır loglanmaz: Graph hataları URL'siz, yalnız type+code+message olarak
  yazılır (URL'de access_token olabilir).

## Komutlar

- `npm run dev` / `build` / `preview`
- `npm run typecheck` - vue-tsc
- `npm run smoke` - build sonrası gerçek Chrome doğrulaması (`scripts/smoke.mjs`);
  bu Mac'te sistem Chrome'u, CI'da `CHROME_PATH`
- `npm run assets` - `public/og.png` ve `public/favicon.ico`'yu yeniden üretir
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

- Beta başvurusu Neon'a `NUXT_DATABASE_URL` ile yazar (yukarı bkz.); boşken route
  503 'soon' döner, form "çok yakında" moduna geçer. Çalışmayan form yayınlanmaz.
- Dal modeli: `feature/*` → `development` → `staging` → `main`
  (`afiet-mobile/docs/BRANCHING.md`). `main` = Vercel production.
- Her anlamlı değişiklikten sonra: `npm run build && npm run smoke`.
- Emoji yalnızca mesaj metinlerinde/avatarlarda; ikon gereken yerde inline SVG.

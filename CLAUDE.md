# afiet-web

afiet.co tanıtım sitesi (landing). Uygulama yalnızca native mobilde yaşar -
bu sitede uygulamaya/PWA'ya link verilmez. Birincil CTA `/indir` sayfasıdır ve
mağaza rozetleri oradan (ve ana sayfadan) mağazaya bağlanır. UI dili Türkçe +
sınırlı İngilizce (/en, aşağı bkz.).

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
  PhoneMock, ZagSection, VoiceSection, CtaSection, StoreBadges, SiteFooter…)
- `v-reveal` direktifi (`app/plugins/reveal.ts`) scroll'da `.is-in` ekler;
  hero'daki açılış animasyonu `.rise` sınıfıyla CSS'te
- Afi maskotu `AfiMascot.vue` - buhar telleri hep İKİ tanedir, yüz ifadesi sabittir
  (BRAND.md > Logo); `public/icon.svg` ile birlikte değişir
- `public/bimi/afi.svg` - e-posta istemcilerinde gönderen avatarı (BIMI). DNS'teki
  `default._bimi.posta.afiet.co` kaydı bu URL'i gösterir, yani DOSYA YOLU SABİT
  KALMALI, taşınırsa avatar düşer. SVG Tiny P/S profili: `baseProfile="tiny-ps"`,
  `<title>` zorunlu, kare viewBox, script/animasyon/dış referans yasak. Kaynağı
  `afiet-brand/logo/afi-icon.svg`, marka logosu değişirse bu da elle yenilenir.
- **Beta EMEKLİ (24 Ağu 2026).** afiet App Store'da yayına girdi; `/beta`
  sayfası, `BetaForm.vue` ve `POST /api/beta/apply` kaldırıldı, yerini `/indir`
  aldı (`app/pages/indir.vue`, kopya `content.ts > indir`). `beta_applications`
  tablosu ARŞİV olarak duruyor: 22 satırın KVKK rıza kaydı ve panelin Büyüme
  kırılımı ondan besleniyor. Okuma ucu `GET /api/admin/beta` çalışmaya devam
  ediyor, yazma ucu YOK ve geri de gelmemeli (smoke ucun 404 kaldığını korur).
  Landing'de tek e-posta toplama noktası bültendir; eski bekleme listesi
  (`waitlist` tablosu + formu) 27 Tem 2026'da kaldırılmıştı.

## Çok dillilik (/en)

- TR kökte yaşar ve URL'leri DEĞİŞMEZ; İngilizce `/en` altındadır
  (`app/pages/en/`). i18n modülü BİLİNÇLİ olarak yok: kopya zaten
  `content.ts` deseninde, meta/hreflang panel yönetimli `usePageSeo`tan
  akıyor; modülün mesaj kataloğu ve head yönetimi bu iki sistemle çatışırdı.
- TR↔EN sayfa eşlemesinin TEK kaynağı `shared/utils/locales.ts > EN_BY_TR`.
  Üç tüketicisi var: hreflang alternates (`seoStore.resolvePageMeta`),
  sitemap `xhtml:link` (`buildSitemapXml`), dil düğmesi (`SiteHeader`,
  `useSiteLocale`). Yeni sayfa çevrildiğinde haritaya satır + `DEFAULT_PAGES`e
  EN meta kaydı eklenir; başka yere dokunulmaz.
- KURAL: çevirisi olmayan sayfaya `/en` yolu AÇILMAZ ve TR içerik `/en`
  altında fallback servis edilmez (duplicate/soft-404). hreflang yalnız
  gerçekten iki dilde yaşayan çiftlere basılır; `x-default` TR'dir.
- Accept-Language/IP yönlendirmesi YAPILMAZ (Googlebot ABD'den tarar);
  dil geçişi yalnız header'daki düğmedir ve karşılığı olmayan sayfada görünmez.
- EN kopya `app/data/content.en.ts`te; ton kuralları ve em dash yasağı
  İngilizce için de geçerli. EN'in dönüşümü bültendir (kullanıcı kararı, 5 Ağu
  2026): uygulama bugün Türkçe konuşuyor (`lang='en'` aboneliği; onay maili
  İngilizce gider, iniş `/en/newsletter/confirm`). Mağaza rozetleri 24 Ağu'da
  BAĞLANDI: İngilizce konuşan biri de indirebilir, uygulamanın Türkçe olduğunu
  sayfa açıkça söyler. Ayrı bir `/en/download` sayfası bilinçli AÇILMADI. `bulten-gonder.mjs`
  varsayılan tr gönderir, İngilizce duyuru `--lang en` ister.
- İki dilde yaşayan gövdeler tek bileşendedir (`KartpostalIletisim`,
  `PrivacyArticle`, `DeleteAccountArticle`); TR politika metni değişirse
  `privacyEn` de birlikte değişir.
- **İngilizce hesaplayıcılar** (`/en/tools/*`, dört araç): motor AYNI
  (`#shared/hesap`, @afiet/core aynası) ve ona İngilizce SIZMAZ. Motor Türkçe
  etiket döndürdüğü için sayfalar sabit ANAHTARDAN çevirir
  (`content.en.ts > toolsEn`: `bmiRangeLabels`, `activityLabels`, `handTerms`,
  `minorNote`); el ölçüsü metni `HandMeasure.text`ten değil `count`tan kurulur.
  Smoke aynı girdide TR ve EN'in aynı sayıyı verdiğini doğrular.
- Birim seçici (metrik/imperial) YALNIZ girdi katmanındadır
  (`shared/hesap/birim.ts` + `ToolField.vue`): kullanıcı ft/in/lb yazar, sayfa
  cm/kg'ye çevirir, `makulMu` denetimi metrik tabanda kalır. Varsayılan
  imperial (`useUnitSystem`, localStorage; tercih onMounted'da okunur, yoksa
  hidrasyon uyumsuzluğu olur).
- Porsiyon çevirici İngilizce'de BİLEREK yok: katalog 2007 Türkçe besin adı
  taşıyor. Smoke `/en/tools/portion-converter`ın 404 kaldığını kontrol eder.
- İngilizce uzun içerik `content/hesapla/en/<slug>.md`; SSS başlığı
  `Frequently asked questions` (store iki başlığı da tanır). 600 kelime eşiği
  İngilizce sayfalar için de smoke'ta korunur.
- **İngilizce blog** (`/en/blog`): yazılar `blog_posts.lang` ile ayrılır
  (varsayılan `tr`, ALTER ile geldi). Bir yazı YALNIZ kendi dilinin yolundan
  açılır; yanlış dilde istenen slug 404'tür (`getPublishedPost(event, slug,
  lang)`). Liste, RSS ve sitemap hep dile göre süzülür.
- Yazı eşlemesi `blog_posts.translation_of` (karşı yazının slug'ı, çoğu yazıda
  NULL). Eşleme TEK SATIRA yazılır ama hreflang ÇİFT YÖNLÜ olmak zorunda, o
  yüzden arama iki yönlüdür (`findTranslationPair`): yalnız ileri yönde
  arayan bir sürüm Türkçe uçta hreflang basmıyordu ve Google tek yönlüyü yok
  sayar. Karşı yazı yayında değilse ya da aynı dildeyse hiç basılmaz.
- `/en/blog` İngilizce yazı YOKKEN sitemap'e, menüye ve llms.txt'ye girmez
  (kullanıcı kararı, 6 Ağu 2026): sayfa çalışır, boş durumu gösterir, hiçbir
  yerden bağlanmaz. Üç koşul sırasıyla `sitemap.xml.ts`, `useEnBlog`
  (`SiteHeader`/`SiteFooter`) ve `llms.txt.ts` içinde; smoke üçünü de
  kontrol eder. `EN_BY_TR`ye `/blog` → `/en/blog` satırı bilinçli EKLENMEDİ:
  ilk İngilizce yazı yayınlandığında eklenecek (o zamana kadar hub'lar
  birbirine hreflang vermemeli).
- İlk İngilizce yazı yayınlanınca yapılacaklar: `EN_BY_TR`ye hub satırı,
  `content/posts/en/<slug>.md` yedeği, frontmatter'da `lang: en` (+ çeviriyse
  `translation_of`). Panel (afiet-admin) dil rozetini AYRI bir turda alacak;
  o güne dek `BlogPostSummary`ye `lang` EKLENMEZ, iki repo aynası bozulmasın.

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
- **Global robots meta:** indekslenen her sayfa `seoDefaults.ts >
  ROBOTS_DIRECTIVES` satırını basar (`index, follow, max-snippet:-1,
  max-image-preview:large, max-video-preview:-1`). Üçü de bir SINIRI kaldırır;
  açıkça verilmezse motor kendi sınırını uygular ve alıntılanabilir metin
  kısalır. Panelden yönetilmez (kullanıcı kararı, 11 Ağu 2026); sayfa bazlı
  istisna `seo_pages[<yol>].robots` ile verilir ve o değer bu satırın TAMAMININ
  yerine geçer (birleştirilmez, örn. noindex sayfasına max-snippet eklenmez).
- **Yazar kimliği (E-E-A-T):** blog ve destek yazılarının `author`ı
  Organization değil **Person**'dır ve tek kaynağı `shared/utils/author.ts`tir.
  Aynı kayıt hem Person JSON-LD'sini (seoStore) hem sayfadaki görünür künyeyi
  (`YazarSatiri.vue`, blog sonunda `YazarKarti.vue`) besler - ikisi ayrışırsa
  şema sayfanın söylemediğini iddia eder. Kimlik `@id` ile tektir
  (`/hakkinda#yazar`) ve İngilizce sayfada da AYNI kalır; yalnız unvan/biyografi
  çevrilir. Yayıncı kurum olarak kalır (yazan kişi, yayınlayan afiet).
- Yazar sayfası `/hakkinda` (+ `/en/about`) yalnız bir "hakkımızda" değil,
  Person şemasının URL'idir: yolu değişirse `author.ts`, `EN_BY_TR` ve
  `seoDefaults`taki sayfa kaydı BİRLİKTE değişir. Gövde `HakkindaSayfasi.vue`,
  kopya `content.ts > hakkinda` / `content.en.ts > aboutEn`.
- JSON-LD: ana sayfada Organization+WebSite+SoftwareApplication grafiği +
  (doluysa) FAQPage. SSS maddeleri hem görünür bölüm (`FaqSection.vue`, boşsa
  render edilmez) hem şemadır - ikisi hep aynı kaynaktan gelir.
- **Mağaza kapısı MAĞAZA BAŞINADIR** (`#shared/utils/marka > MAGAZA`):
  `ios: true` (App Store'da canlı), `android: false` (Play adresi bugün 404).
  Tek boolean'dı, 24 Ağu 2026'da ikiye ayrıldı: iOS çıkıp Android çıkmayınca
  tek bayrak, canlı bir adresle 404 bir adresi birlikte yayınlamak demekti.
  Rozet de şema da (`installUrl`, `operatingSystem`) kendi bayrağına bakar.
  Android açıldığı gün `MAGAZA.android` + `MARKA_KUNYE.platformlar` +
  şemadaki `operatingSystem` BİRLİKTE değişir; smoke açık mağazanın bağlantı,
  kapalının bağlantı OLMADIĞINI korur.
- **Fiyatın TEK KAYNAĞI `marka.ts > AFIET_PLUS`** (kullanıcı kararı, 26 Ağu
  2026; 24 Ağustos'taki "site fiyat söylemez" kararının yerine geçer). Değerler
  App Store Connect'ten okundu: aylık **129,90**, yıllık **799,99**, yıllığın
  ilk yılı **599,99** (5 Ağu'da başlayan, bitiş tarihi olmayan teklif).
  **129,99 basamağı Apple'ın TR merdiveninde YOKTUR**, öyle yazan belge
  yanlıştır. Üç sayı BİRLİKTE yazılır: yıllığın liste fiyatını tek başına
  söylemek eksik anlatır. Okuyan üç yer: `/destek/baslangic/afiet-plus-nedir`,
  `/indir` SSS'i (`content.ts`) ve `seoStore > mobilAppOffers`. Şemada
  uygulamanın kendisi `price: 0`, afiet+ ayrı bir `addOn` satırıdır; ilk yıl
  teklifi şemaya BASILMAZ (`Offer` süresiz bir kampanyayı anlatamaz).
- Hesaplayıcı hub'ları (`/hesapla`, `/en/tools`) CollectionPage + ItemList
  basar ve liste `pages`ten türer, kopya dosyasındaki kart listesinden değil:
  şema yalnız gerçekten var olan alt sayfaları vaat etmeli. Sıra iddia
  edilmez (`ItemListUnordered`).
- **İki sabit `@id`, iki varlık:** kurum `<base>/#organization`
  (`seoStore > organizationNode`, ana sayfa + `/en` + basın kiti aynısını
  taşır), kişi `<base>/hakkinda#yazar` (`shared/utils/author.ts > personId`).
  Aynı varlığı tarif eden düğümler aynı `@id`yi taşımazsa motorlar birbirinden
  habersiz adaylar görür. Yeni bir sayfaya kurum ya da kişi düğümü eklerken
  düğümü ELLE yazma, bu iki fonksiyondan geç.
- Dinamik route'lar: `/robots.txt` (AI bot izinleri panelden; varsayılan liste
  `seoDefaults.ts > AI_BOTS`, Bytespider engelli), `/sitemap.xml`, `/llms.txt`.
  `public/robots.txt` bilinçli olarak YOK.
- **Yönlendirmeler iki kaynaklıdır** (`server/middleware/redirects.ts`, tam yol
  eşleşmesi): kod varsayılanları `seoDefaults.ts > DEFAULT_REDIRECTS` +
  panelden gelenler, aynı `from` için PANEL kazanır (`seoStore > mergeRedirects`).
  Yapısal ve kalıcı adres taşımaları KODA yazılır: dev/staging'de de çalışsın,
  PR'da gözden geçirilsin ve panelde bir "varsayılana dön" ile sessizce
  düşmesin. Kampanya/geçici yönlendirme panelde kalır.
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
- **Künye gövdeye YAZILMAZ** (11 Ağu 2026): yazının başındaki `*Yazan: … · Son
  güncelleme: …*` satırı 10 md dosyasından çıkarıldı, yerini bileşendeki yazar
  künyesi aldı (`YazarSatiri.vue`, tek kaynak `shared/utils/author.ts`).
  Yeni yazıda o satırı geri ekleme; afiet-admin'deki üretim promptu da bunu
  artık istemiyor. Tarih künyeden değil DB'den gelir (`publishedAt`/`updatedAt`).
  Prod'da yayındaki yazıların gövdesinde satır HÂLÂ var, yeniden yayınlanana
  kadar duracak (bu yüzden BlogYazi'deki gömme başlık kuralı iki hâli de tanır).
- Yayınlama (deploy YOK): panel prompt'u → Claude Code yazıyı
  `content/posts/<slug>.md`e yazar → onay → `node scripts/publish-post.mjs
  content/posts/<slug>.md` (Neon host'u gösterip onay ister; upsert + bağlı
  panel içeriğini "yayında" yapar). Görünürlük: sayfa ≤ ~2 dk, sitemap/RSS ≤ 5 dk.
  Yayından kaldırma: `--unpublish <slug>`. md dosyaları sürümlü YEDEKTİR;
  script'teki DDL `contentStore.ts` ile senkron tutulur.
- **IndexNow bildirimi iki yoldan da yapılır.** Elle yayında `publish-post.mjs`
  bildirir; içerik hattı (Go backend) `/api/internal/blog/publish` ucundan
  yayınladığı için AYRI bir uçtan bildirir: `/api/internal/blog/indexnow`.
  O uç yoksa hat yayınlar ama kimseye söylemez, ki 22 Ağu 2026'ya kadar tam
  olarak böyleydi (hattan çıkan altı yazının beşi GSC'de `discovered`,
  taranmamış). Uç her adresin **canlı olduğunu doğrular** ve yalnız kabul
  ettiklerini döner: yeni yazı ISR yüzünden birkaç dakika 404'tür ve bir
  tarayıcıyı 404'e yollamak hiç yollamamaktan kötüdür. Gerisini backend bir
  sonraki tick'te yeniden dener.
- Protokol tek yerde: `shared/utils/indexnow.mjs` (.ts değil, CLI onu düz
  `node` ile içe aktarıyor). Anahtar orada DEĞİL; tek kaynağı
  `public/<anahtar>.txt`, CLI diskten okur, sunucu tarafı build'de okunan
  `runtimeConfig.indexnowKey`ten alır (Vercel'de public/ CDN'e gider,
  fonksiyonun dosya sistemine değil).

## Destek merkezi (/destek)

- **İçerik REPODA yaşar, veritabanında DEĞİL:** `content/destek/<kategori>/<slug>.md`.
  Nitro `serverAssets` ile sunucu paketine gömülür (`nuxt.config > nitro`),
  `useStorage('assets:destek')` ile okunur. Yani dokümantasyon ürünle birlikte
  sürümlenir, PR'da gözden geçirilir ve development/staging'de de DOLUDUR
  (blogun aksine). Yayına almak = commit + deploy.
- Kategori seti kodda: `server/utils/supportCategories.ts` (7 kategori, aksan
  renkleri uygulamadaki besin grubu renkleridir; son iki kategori bilinçli
  nötrdür). **Kategori slug'ı yayınlandıktan sonra DEĞİŞTİRİLMEZ.** Tek istisna
  24 Ağu 2026'da yaşandı (`beta-sorun-giderme` → `sorun-giderme`, beta kapandı);
  gerekçesi ve bedeli dosyanın başında yazılı, emsal sayma.
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
- `/llms.txt`'nin destek bölümü panelden değil KODDAN üretilir (elle güncellenen
  liste eskir). `/llms-full.txt` ise 26 Ağu 2026'da BUDANDI: eskiden destek
  gövdesinin tamamıydı (200 KB, 14 günde sıfır istek, blog ve hesaplama
  araçlarını hiç taşımıyordu), artık üç yüzeyin de her maddesinden yalnız
  başlık + doğrudan cevap + kanonik adres taşıyor (~35 KB). Cevap
  `server/utils/answerDigest.ts > answerOpening` ile gövdenin başından
  ÇIKARILIR, ayrıca yazılmaz: içerik hattının "cevap önce" kuralı bozulursa bu
  dosya da bozulur, yani kuralın sessiz denetçisidir.
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

## Hesaplama araçlarının uzun içeriği (/hesapla/*)

- **NEDEN VAR:** beş hesap sayfası sitenin en yüksek arama talebi olan
  adresleriydi ama hesap istemcide döndüğü için sunucudan yalnız **101-145
  kelime** çıkıyordu; arama motoru boş sayfa görüyordu. Uzun içerik eklendikten
  sonra 797-903 kelime. `scripts/smoke.mjs` bunu eşikle korur (600 kelime),
  yani içerik dosyası silinirse ya da katlama JS'e taşınırsa smoke düşer.
- **İçerik REPODA yaşar:** `content/hesapla/<slug>.md`, destek merkezi ve sürüm
  notlarıyla aynı yol (Nitro `serverAssets` → `useStorage('assets:hesapla')`,
  `server/utils/hesaplaStore.ts`). Yayına almak = commit + deploy.
- **Gövde sözleşmesi:** yalnız `## Başlık` bölümleri. Başlığı tam olarak
  `Sık sorulanlar` olan bölüm SSS'dir ve `**Soru?**` + cevap çiftlerine
  ayrılır; geri kalanı katlanır panel olur. Başlık tutmuyorsa SSS boş döner ve
  FAQPage şeması BASILMAZ (uydurma şema basmaktansa hiç basmamak yeğdir).
  Slug frontmatter'dan gelir, dosya adından türetilmez.
- **Katlama native `<details>`tir**, JS'e taşınmaz: katlama JavaScript'e bağlı
  olsaydı içerik ilk HTML'de bulunmaz ve bütün işin sebebi ortadan kalkardı.
- Sayfalar tek satırla bağlanır: `useHesapIcerik(c.slug)`
  (`app/composables/`), bileşen `HesapIcerik.vue`. İçerik yoksa `null` döner ve
  sayfa yalnız hesabı gösterir; eksik metin çalışan bir hesabı düşürmez.
- Şema `seoStore.resolvePageMeta` içinde: WebApplication + BreadcrumbList +
  (SSS doluysa) FAQPage. **FAQPage'in SERP'te görsel karşılığı YOKTUR** (Google
  zengin sonucu Ağu 2023'te kamu ve sağlık siteleriyle sınırladı); GEO için
  basılır. `HowTo` burada da kullanılmaz, destekteki gerekçenin aynısı.
- Marka doktrini bu metinlerde de bağlayıcıdır (hedeflerim.md § 9 ve § 12):
  ideal/hedef kilo yok, süre vaadi yok, hüküm kuran sıfat yok. Smoke bunu iki
  kalıpla ayrıca kontrol eder.

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

## Basın kiti (/basin + /en/press)

- **Tek cümlelik marka tanımı** `shared/utils/marka.ts > MARKA_TANIM`tadır ve
  TEK KAYNAKTIR (kullanıcı kararı, 11 Ağu 2026). Ana sayfanın meta
  description'ı, `SoftwareApplication` şeması ve basın sayfası aynı cümleyi
  İÇERİ AKTARIR; hiçbir yere elle kopyalanmaz. Karakter sınırı yüzünden
  kısaltılan üç yer (App Store Subtitle 30, Play kısa açıklama 80, Wikidata)
  dosyanın başında istisna olarak sayılıdır. Künye alanları (slogan, lansman
  penceresi, platformlar) `MARKA_KUNYE`den gelir.
- Gövde `BasinKiti.vue`, kopya `content.ts > basin` / `content.en.ts > pressEn`
  (anahtarlar birebir aynı). Sayfa gazeteciyi ikna etmez, işini kolaylaştırır:
  hiçbir malzeme form arkasında durmaz ve kanıtlanamayan rakam yazılmaz.
- Şema: `AboutPage` + `mainEntity` Organization + BreadcrumbList
  (`seoStore.resolvePageMeta`). `/hakkinda`nın ProfilePage+Person kalıbının
  kurumsal ikizidir: orada sayfanın konusu kişi, burada kurum. Organization
  ana sayfayla aynı `@id`yi taşır ve `founder` yazar kimliğine bağlanır, yani
  kurum ↔ kurucu ↔ yazar tek grafikte birleşir.
- **Dosyalar `public/basin-kiti/` altında, sayfanın yolu `/basin`.** İkisi
  BİLEREK ayrı adtadır: public/ altında rotayla aynı adı taşıyan bir klasör o
  rotayı gölgeler ve `/basin` isteği `/basin/` dizinine 301'lenir. Smoke bunu
  `redirect: 'manual'` ile kontrol eder.
- Malzeme `npm run basin-kiti` ile afiet-brand'den üretilir (logolar + App
  Store ekranları + ZIP). Script yalnız bu Mac'te koşar (afiet-brand uzakta
  yok), çıktısı repoda yaşar; CI onu üretmez, var kabul eder. Koyu zemin için
  beyaz kilit brand'de YOK, script iki dokümante rengi değiştirerek türetir.

## Komutlar

- `npm run dev` / `build` / `preview`
- `npm run typecheck` - vue-tsc
- `npm run smoke` - build sonrası gerçek Chrome doğrulaması (`scripts/smoke.mjs`);
  bu Mac'te sistem Chrome'u, CI'da `CHROME_PATH`
- `npm run assets` - `public/og.png` ve `public/favicon.ico`'yu yeniden üretir
  (`scripts/generate-assets.mjs`)
- `npm run basin-kiti` - basın malzemesini afiet-brand'den yeniden üretir
  (`scripts/basin-kiti.mjs`, çıktı `public/basin-kiti/`)

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

- Bülten kaydı Neon'a `NUXT_DATABASE_URL` ile yazar; boşken route 503 'soon'
  döner ve form "çok yakında" moduna geçer. Çalışmayan form yayınlanmaz.
- Dal modeli: `feature/*` → `development` → `staging` → `main`
  (`afiet-mobile/docs/BRANCHING.md`). `main` = Vercel production.
- Her anlamlı değişiklikten sonra: `npm run build && npm run smoke`.
- Emoji yalnızca mesaj metinlerinde/avatarlarda; ikon gereken yerde inline SVG.

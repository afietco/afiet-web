import type {
  AiBotInfo,
  PageSeo,
  SeoBundle,
  SeoRedirect,
  SeoSettings,
} from './seoTypes'
import { MAGAZA, MARKA_KUNYE, MARKA_TANIM } from '#shared/utils/marka'
import { SUPPORT_CATEGORIES } from './supportCategories'

/**
 * Kod varsayılanları = bugünkü canlı davranış. DB yalnızca bunların üzerine
 * yazılan kısmı tutar; panel "varsayılana dön" dediğinde DB satırı silinir
 * ve buradaki değerlere geri düşülür.
 */

const SITE_URL = 'https://afiet.co'
const TITLE = 'afiet | Sayma, dengele.'
/**
 * Ana sayfanın meta açıklaması = tek cümlelik marka tanımının KENDİSİ
 * (`#shared/utils/marka`). Buraya ayrı bir metin yazma: tanım tek yerde
 * yaşar, kampanya/CTA cümlesi `ogDescription`a ve panele bırakılır.
 */
const DESCRIPTION = MARKA_TANIM.tr

/**
 * AI botları - Temmuz 2026 durumu (kaynaklar: sağlayıcıların resmi crawler
 * dokümanları). purpose: egitim = model eğitimi (trafik getirmez),
 * arama = AI arama indeksi/alıntı (GEO görünürlüğünün kaynağı),
 * kullanici = kullanıcı-tetikli canlı getirme.
 */
export const AI_BOTS: AiBotInfo[] = [
  { agent: 'OAI-SearchBot', owner: 'OpenAI', purpose: 'arama', note: 'ChatGPT Search alıntıları; GEO için kritik' },
  { agent: 'ChatGPT-User', owner: 'OpenAI', purpose: 'kullanici', note: 'Kullanıcı link paylaşınca anlık getirme' },
  { agent: 'GPTBot', owner: 'OpenAI', purpose: 'egitim', note: 'Model eğitimi; engellemek arama görünürlüğünü etkilemez' },
  { agent: 'Claude-SearchBot', owner: 'Anthropic', purpose: 'arama', note: 'Claude arama indeksi' },
  { agent: 'Claude-User', owner: 'Anthropic', purpose: 'kullanici', note: 'Kullanıcı sorusu için sayfa çekme' },
  { agent: 'ClaudeBot', owner: 'Anthropic', purpose: 'egitim', note: 'Model eğitimi' },
  { agent: 'PerplexityBot', owner: 'Perplexity', purpose: 'arama', note: 'Perplexity alıntı indeksi' },
  { agent: 'Perplexity-User', owner: 'Perplexity', purpose: 'kullanici', note: 'Canlı getirme (robots.txt’e her zaman uymayabiliyor)' },
  { agent: 'Google-Extended', owner: 'Google', purpose: 'egitim', note: 'Gemini eğitimi kontrol token’ı; Arama/AI Overviews’u ETKİLEMEZ' },
  { agent: 'Applebot-Extended', owner: 'Apple', purpose: 'egitim', note: 'Apple Intelligence eğitim izni; Siri/Spotlight’ı etkilemez' },
  { agent: 'meta-externalagent', owner: 'Meta', purpose: 'egitim', note: 'Meta AI; eğitim + getirme karışık' },
  { agent: 'Amazonbot', owner: 'Amazon', purpose: 'arama', note: 'Alexa/Rufus yanıtları' },
  { agent: 'MistralAI-User', owner: 'Mistral', purpose: 'kullanici', note: 'Le Chat canlı getirme' },
  { agent: 'DuckAssistBot', owner: 'DuckDuckGo', purpose: 'arama', note: 'DuckAssist özetleri' },
  { agent: 'CCBot', owner: 'Common Crawl', purpose: 'egitim', note: 'Açık veri seti; birçok modele dolaylı kaynak' },
  { agent: 'Bytespider', owner: 'ByteDance', purpose: 'egitim', note: 'Agresif, uyumsuzluk geçmişi var; varsayılan engelli' },
]

const defaultAiBotPolicy: Record<string, boolean> = Object.fromEntries(
  AI_BOTS.map((b) => [b.agent, b.agent !== 'Bytespider']),
)

/**
 * `AI_BOTS`ta olup GERÇEKTE İSTEK ATMAYANLAR.
 *
 * Google-Extended ve Applebot-Extended birer TARAYICI DEĞİL, yalnızca
 * robots.txt izin anahtarıdır: sahipleri onlarla hiç HTTP isteği yapmaz, o
 * anahtarı Googlebot'un/Applebot'un topladığı içeriğin EĞİTİMDE kullanılıp
 * kullanılmayacağını söylemek için okur. robots.txt'te durmaları doğrudur
 * (izni orada veriyoruz), tespit listesinde durmaları ise panelde sonsuza
 * kadar "hiç gelmedi" satırı üretir ve gerçek bir yokluk sanılır.
 * Ölçüldü: 11-24 Ağu 2026 arası 366 istekte ikisinden tek satır yok.
 */
const SADECE_ROBOTS_ANAHTARI = new Set(['Google-Extended', 'Applebot-Extended'])

/**
 * İZLENEN BOTLAR = kayda (ai_bot_hits) girecek tarayıcıların TAM listesi.
 * `AI_BOTS`tan AYRI durur ve karıştırılmamalıdır:
 *
 *   AI_BOTS        → robots.txt POLİTİKASI. Panelden izin verilip alınabilen
 *                    liste. Buraya Googlebot eklemek, panelde Googlebot'u
 *                    engelleme düğmesi açmak demektir; asla eklenmez.
 *   IZLENEN_BOTLAR → yalnız ÖLÇÜM. Kime izin verdiğimizle ilgisi yok, "kim
 *                    geldi" sorusunun cevabı.
 *
 * NEDEN GENİŞLETİLDİ (24 Ağu 2026 denetimi): kayıt yalnız AI_BOTS'u tanıdığı
 * için ölçüm iki en önemli tarayıcıyı YAPISAL OLARAK göremiyordu. Bingbot
 * hem Bing'i hem Copilot'u hem de ChatGPT aramasının indeksini besliyor;
 * Googlebot'un taraması AI Overviews'in de taramasıdır (ayrı bot yok); düz
 * Applebot Siri ve Spotlight yüzeyidir ve Applebot-Extended ile aynı şey
 * değildir. Üçü de listede olmadığı için panelde hiç görünmüyorlardı.
 *
 * `purpose` kasıtlı olarak üç değerle sınırlı kalıyor (afiet-admin
 * `services/analytics.ts > AiBotData.amac` birebir ayna, dördüncü bir değer
 * panelde rozetsiz kalır): arama motorları 'arama', link önizleme getirenleri
 * 'kullanici' (isteği bir insanın paylaşımı tetikler), gerisi 'egitim'.
 */
export const IZLENEN_BOTLAR: AiBotInfo[] = [
  ...AI_BOTS.filter((b) => !SADECE_ROBOTS_ANAHTARI.has(b.agent)),

  // ── Arama motorları: AI yanıt yüzeylerinin gerçek tarayıcıları ──────────
  { agent: 'Googlebot', owner: 'Google', purpose: 'arama', note: 'Arama + AI Overviews/AI Mode; ayrı bir AI tarayıcısı YOK' },
  { agent: 'Bingbot', owner: 'Microsoft', purpose: 'arama', note: 'Bing + Copilot + ChatGPT aramasının indeksi' },
  { agent: 'Applebot', owner: 'Apple', purpose: 'arama', note: 'Siri/Spotlight; Applebot-Extended yalnız eğitim izni anahtarıdır' },
  { agent: 'DuckDuckBot', owner: 'DuckDuckGo', purpose: 'arama', note: 'DuckDuckGo taraması' },
  { agent: 'YandexBot', owner: 'Yandex', purpose: 'arama', note: 'Yandex; Türkiye`de küçük ama gerçek bir pay' },
  { agent: 'Yeti', owner: 'Naver', purpose: 'arama', note: 'Naver taraması' },
  { agent: 'Seznam', owner: 'Seznam', purpose: 'arama', note: 'IndexNow protokolünü okuyan üçüncü motor' },

  // ── Kullanıcı tetikli AI getirmeleri ────────────────────────────────────
  { agent: 'Meta-ExternalFetcher', owner: 'Meta', purpose: 'kullanici', note: 'meta-externalagent`ten AYRI: kullanıcı isteğiyle anlık getirme' },
  { agent: 'Google-CloudVertexBot', owner: 'Google', purpose: 'kullanici', note: 'Vertex AI ajanı, kurumsal müşteri onayıyla getirir' },
  { agent: 'Google-NotebookLM', owner: 'Google', purpose: 'kullanici', note: 'NotebookLM kaynak getirmesi; robots.txt`e uymaz' },
  { agent: 'FirecrawlAgent', owner: 'Firecrawl', purpose: 'kullanici', note: 'Çok kiracılı kazıma servisi; arkasında kim var bilinmez' },

  // ── Eğitim ve veri seti tarayıcıları ────────────────────────────────────
  { agent: 'cohere-ai', owner: 'Cohere', purpose: 'egitim', note: 'Belgelenmemiş eğitim taraması' },
  { agent: 'AI2Bot', owner: 'Allen Institute', purpose: 'egitim', note: 'Açık araştırma veri seti' },
  { agent: 'Diffbot', owner: 'Diffbot', purpose: 'egitim', note: 'Bilgi grafiği; birçok modele dolaylı kaynak' },
  { agent: 'YouBot', owner: 'You.com', purpose: 'arama', note: 'You.com yanıt indeksi' },
  { agent: 'ImagesiftBot', owner: 'Hive', purpose: 'egitim', note: 'Görsel veri seti' },
  { agent: 'Timpibot', owner: 'Timpi', purpose: 'egitim', note: 'Dağıtık indeks' },
  { agent: 'PanguBot', owner: 'Huawei', purpose: 'egitim', note: 'PanGu modeli' },
  { agent: 'Omgilibot', owner: 'Webz.io', purpose: 'egitim', note: 'Veri satıcısı; webzio-extended ile aynı ev' },
  { agent: 'SemrushBot-OCOB', owner: 'Semrush', purpose: 'egitim', note: 'Semrush`un AI içerik toplayıcısı (normal SemrushBot`tan ayrı)' },

  // ── Link önizlemesi: AI değil, ama "paylaşınca ne görünüyor" ölçümü ─────
  { agent: 'facebookexternalhit', owner: 'Meta', purpose: 'kullanici', note: 'Facebook/Instagram/WhatsApp link önizlemesi; meta-externalagent DEĞİL' },
  { agent: 'Twitterbot', owner: 'X', purpose: 'kullanici', note: 'X kart önizlemesi' },
  { agent: 'LinkedInBot', owner: 'LinkedIn', purpose: 'kullanici', note: 'LinkedIn paylaşım önizlemesi' },
  { agent: 'Slackbot-LinkExpanding', owner: 'Slack', purpose: 'kullanici', note: 'Slack link genişletmesi' },
  { agent: 'TelegramBot', owner: 'Telegram', purpose: 'kullanici', note: 'Telegram önizlemesi' },
  { agent: 'Discordbot', owner: 'Discord', purpose: 'kullanici', note: 'Discord gömme önizlemesi' },
]

/**
 * İndekslenen her sayfanın `robots` meta'sı. Üç direktif de bir SINIRI KALDIRIR,
 * yeni bir izin istemez:
 *   - `max-snippet:-1`        → arama sonucundaki metin parçasına uzunluk sınırı yok
 *   - `max-image-preview:large` → görsel önizlemesi büyük boy çıkabilir
 *   - `max-video-preview:-1`  → video önizlemesine süre sınırı yok
 * Varsayılan davranış Google'da zaten bunlara yakındır ama AÇIKÇA verilmediğinde
 * motor kendi sınırını uygular; AI Overviews/alıntı yüzeyinde alıntılanabilir
 * metnin uzunluğu doğrudan bu satıra bakar. `index, follow` bilinçli olarak
 * başta durur: tek meta etiketinde hem indeksleme hem sınır bilgisi bulunsun.
 *
 * Bu değer PANELDEN YÖNETİLMEZ (kullanıcı kararı, 11 Ağu 2026): pratikte hiç
 * değişmeyen bir sabit için iki repoya alan açmanın karşılığı yok. Sayfa bazlı
 * istisna yine panelden verilebilir - `seo_pages[<yol>].robots` doluysa o
 * değer bu satırın TAMAMININ yerine geçer (birleştirilmez).
 */
export const ROBOTS_DIRECTIVES =
  'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1'

/**
 * KOD SAYFALARININ İÇERİK TARİHİ. Sitemap `lastmod`u bu tarihle panel
 * kaydının YENİSİNİ basar (`buildSitemapXml`).
 *
 * NEDEN VAR (24 Ağu 2026 denetimi): `lastmod`un tek kaynağı `seo_pages`
 * satırının `updated_at`i, yani PANELDEN META DÜZENLEME zamanıydı. Bir sayfanın
 * görünür içeriği deploy'la değiştiğinde (bileşen ya da `content/` dosyası)
 * sitemap "değişmedim" demeye devam ediyordu. Ölçülen hâli: 160 URL'in 33'ünde
 * hiç lastmod yok, 82'si aynı gün (1 Ağu, toplu panel kaydı) damgalı, ana sayfa
 * 14 Tem'de kalmış. Bing ve IndexNow bu alanı gerçekten okuyor.
 *
 * NEDEN OTOMATİK DEĞİL: doğru cevap "bu sayfayı besleyen dosyaların en yeni
 * commit tarihi" ama Vercel build'inde git geçmişi yok ve deploy zamanını
 * basmak her deploy'da "34 sayfa da değişti" demek olurdu. Yanlış lastmod
 * Google'ın alanı SİTE GENELİNDE yok saymasına yol açıyor, yani abartmak
 * susmaktan kötü. Bu yüzden tarih ELLE bakılır, tıpkı destek yazılarının
 * frontmatter'daki `updated` alanı gibi.
 *
 * KURAL: bir satır ancak o sayfanın GÖRÜNÜR İÇERİĞİ değiştiğinde güncellenir.
 * Meta/başlık düzenlemesi buraya yazılmaz, onu panel kaydı zaten taşıyor.
 * Listede olmayan sayfa bir hata değildir: gerçek bir tarih yoksa alan hiç
 * basılmaz ve bu doğru davranıştır.
 *
 * Aşağıdaki değerler dosyaların git commit tarihlerinden alındı (24 Ağu 2026).
 * Yalnız TEK bir kaynak dosyası olan sayfalar listelendi; ana sayfa gibi çok
 * bileşenli sayfalar bilerek yok, onlar için "hangi dosya" sorusunun tek bir
 * doğru cevabı yok.
 */
export const SAYFA_ICERIK_TARIHI: Record<string, string> = {
  // content/hesapla/<slug>.md
  '/hesapla/vucut-kitle-indeksi': '2026-08-01',
  '/hesapla/gunluk-su': '2026-08-01',
  '/hesapla/yag-orani': '2026-08-01',
  '/hesapla/porsiyon-cevirici': '2026-08-01',
  '/hesapla/sofra-payin': '2026-08-01',
  // content/hesapla/en/<slug>.md
  '/en/tools/bmi-calculator': '2026-08-06',
  '/en/tools/body-fat-calculator': '2026-08-06',
  '/en/tools/daily-portions-calculator': '2026-08-06',
  '/en/tools/daily-water-calculator': '2026-08-06',
  // app/components/BasinKiti.vue
  '/basin': '2026-08-11',
  '/en/press': '2026-08-11',
  // app/components/HakkindaSayfasi.vue
  '/hakkinda': '2026-08-11',
  '/en/about': '2026-08-11',
  // app/components/PrivacyArticle.vue
  '/gizlilik': '2026-08-05',
  '/en/privacy': '2026-08-05',
  // app/components/DeleteAccountArticle.vue
  '/hesap-sil': '2026-08-05',
  '/en/delete-account': '2026-08-05',
  // app/components/KartpostalIletisim.vue
  '/iletisim': '2026-08-05',
  '/en/contact': '2026-08-05',
  // app/pages/indir.vue - iOS lansmanıyla /beta'nın yerine geldi (fd5a73b)
  '/indir': '2026-08-24',
  // app/pages/kosullar.vue
  '/kosullar': '2026-08-12',
}

export const DEFAULT_SETTINGS: SeoSettings = {
  general: {
    siteName: 'afiet',
    baseUrl: SITE_URL,
    defaultTitle: TITLE,
    defaultDescription: DESCRIPTION,
    defaultOgImage: '/og.png',
    ogImageAlt: 'afiet | Sayma, dengele. Sofra illüstrasyonlu tanıtım görseli',
    twitterSite: '',
    locale: 'tr_TR',
    themeColor: '#fdfaf3',
    verification: { google: '', bing: '', yandex: '' },
  },
  robots: {
    indexable: true,
    aiBots: defaultAiBotPolicy,
    extraRules: '',
  },
  /**
   * llms.txt gövdesi. Başlıktaki `>` özeti llmstxt.org'un "bu site nedir"
   * satırıdır ve tek cümlelik marka tanımının KENDİSİDİR (`#shared/utils/marka`):
   * buraya cümlenin elle yazılmış bir kopyası konmaz. 11 Ağu 2026'ya kadar
   * konmuştu ve tanım sabitlendiğinde bu dosya geride kaldı - üretken motorların
   * okuduğu asıl dosyada markanın kendini tarif eden cümlesi siteninkinden
   * farklıydı.
   */
  llms: {
    enabled: true,
    content: `# afiet

> ${MARKA_TANIM.tr} Tagline: "${MARKA_KUNYE.tagline.tr}"

afiet bir kalori sayacı değildir. Beş besin grubunu renklerle gösterir; kalori hedefi, limit ya da suçluluk dili kullanmaz. Ses tonu "sofrada seni seven biri" gibidir: yargılamaz, davet eder, kutlar. Uygulama iOS'ta App Store'da yayındadır ve ücretsiz indirilir; Android sürümü Google Play'de henüz yayında değildir. İsim her yerde küçük harfle yazılır: "afiet".

## afiet ne yapar
- Türk sofrasının ölçüleriyle konuşur: dilim, kase, avuç, fincan (gram ya da kalori değil).
- Beş besin grubunu renklerle gösterir; gün dengelendikçe sofra tamamlanır.
- Menemenden mercimeğe 2000'i aşkın Türk yemeği ve besin içeride hazırdır.
- Afi asistanı: bilmediğin yemeğin fotoğrafını tanır, kayda yardım eder; soruları sofranın diliyle yanıtlar.
- Haftalık afiyet ritmi: kusursuzluk değil süreklilik; haftanı kendi ritminle görürsün.
- Ailece kullanılır: Soframız'da herkesin kendi profili, hepsinin aynı sofrası; kıyas ve sıralama yoktur.
- iOS ana ekran ve kilit ekranı widget'ları vardır.
- Yargılamaz: kaçırılan günde "yarın yeni bir sofra", denge gününde birlikte kutlama.

## afiet ne yapmaz
- Kalori saydırmaz; kalori hedefi ya da limit koymaz.
- Suçluluk, uyarı ya da utandırma dili kullanmaz.
- Reklam göstermez, veriyi satmaz, kullanıcıyı izlemez.

## Kimin için
- 13 yaş ve üzeri kullanıcılar; bilerek 13 yaş altından veri toplanmaz. 18 yaşından küçükler ebeveyn bilgisiyle kullanır.
- Kalori saymadan, ailece dengeli beslenmek isteyen herkes.

## Veri yaklaşımı
- Yalnızca uygulamanın çalışması için gereken veri toplanır (hesap e-postası, profil, öğün ve ölçü kayıtları).
- Veriler Google Cloud'un Avrupa bölgesindeki sunucularda saklanır; aktarım HTTPS ile şifrelenir.
- Kimlik doğrulama Stack Auth ile sağlanır.
- Hesap ve tüm veriler uygulamadan (menü → Hesap ayarlarım → Hesabı ve tüm verileri sil) ya da e-posta ile silinebilir; talep en geç 30 gün içinde işlenir.

## Durum
- iOS: App Store'da yayında (Ağustos 2026). Uygulama ücretsizdir, indirmek için davet ya da kayıt gerekmez.
- Android: Google Play'de henüz yayında değil, sürüm yolda.
- İndirme sayfası: ${SITE_URL}/indir
- afiet+ isteğe bağlı bir aboneliktir ve yalnız uygulama içinden alınır; afiet'in kendisi ücretsiz kalır.

## Bağlantılar
- [Ana sayfa](${SITE_URL}/): afiet nedir, neden afiet ve Afi'ye soru sorma.
- [İndir](${SITE_URL}/indir): afiet'i indirme adresleri ve ilk gün ne olduğu.
- [Destek merkezi](${SITE_URL}/destek): uygulamanın kullanım dokümantasyonu; kurulum, öğün kaydı, Afi, gruplar, hesap ve sorun giderme.
- [Hesaplama araçları](${SITE_URL}/hesapla): günlük besin ihtiyacı hesabı. Sonuç el ölçüsüyle verilir (avuç içi, yumruk, kapalı avuç, başparmak); kalori ve gram isteğe bağlı bir bölümde durur. İdeal kilo, hedef kilo ve süre vaadi ÜRETİLMEZ; 18 yaş altında hedef verilmez.
- [Destek merkezi tam metin](${SITE_URL}/llms-full.txt): tüm destek yazılarının gövdesi tek dosyada.
- [Blog](${SITE_URL}/blog): kalori saymadan dengeli beslenme, porsiyon ölçüleri ve aile sofrası üzerine rehberler.
- [Hakkında](${SITE_URL}/hakkinda): yazıları kimin yazdığı, hangi kaynaklara dayandığı ve yayın ilkeleri.
- [Basın kiti](${SITE_URL}/basin): afiet basın kiti: logo paketi, ekran görüntüleri, tek cümlelik tanım, kurucu künyesi ve iletişim.
- [Gizlilik Politikası](${SITE_URL}/gizlilik): toplanan veriler, nerede saklandığı ve silme.
- [Hesabını sil](${SITE_URL}/hesap-sil): hesabı ve verileri silme adımları.
- İletişim: destek@afiet.co
`,
  },
  schema: {
    organization: {
      enabled: true,
      name: 'afiet',
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      /**
       * Doğrulanmış dış profiller. `app/data/content.ts > footer.social` ile
       * BİRLİKTE değişir: görünür link kullanıcıya, sameAs arama motoruna aynı
       * kimliği söyler.
       *
       * ⚠️ PROD'DA OVERRIDE VAR: `seo_settings` tablosunda `schema` satırı
       * duruyor ve override varsayılanı EZER. Yani buraya adres eklemek prod'u
       * DEĞİŞTİRMEZ; panelden (admin.afiet.co > Analitik > SEO & GEO) aynı
       * listeyi girmek gerekir. Burası dev/staging ve boş DB'nin kaynağıdır.
       *
       * Var olmayan profile adres YAZILMAZ; hesap açıldıkça tek satır eklenir.
       */
      sameAs: [
        'https://www.instagram.com/afiet.co/',
        'https://medium.com/@afiet.co',
        'https://afiet.substack.com',
        'https://afiet.hashnode.dev',
        'https://www.linkedin.com/company/afiet-app',
      ],
      contactEmail: 'destek@afiet.co',
    },
    website: { enabled: true },
    mobileApp: {
      enabled: true,
      name: 'afiet',
      /* Yalnız gerçekten indirilebilen platform yazılır; Android açıldığı gün
         `MAGAZA.android` ve `MARKA_KUNYE.platformlar` ile BİRLİKTE değişir. */
      operatingSystem: MAGAZA.android ? 'iOS, Android' : 'iOS',
      category: 'HealthApplication',
      /* İlk cümle tanımın kendisidir (tek kaynak); ikinci cümle şemaya özgü
         ayrıntıdır, tanımın yerine geçmez. */
      description: `${MARKA_TANIM.tr} Beş besin grubunu renklerle gösterir, yargılamaz.`,
      /* Adresler `MAGAZA`dan gelir ve her mağaza KENDİ bayrağına bakar
         (bkz. #shared/utils/marka > MAGAZA): App Store adresi 24 Ağu 2026'da
         canlıya girdi, Play adresi bugün hâlâ 404 olduğu için basılmaz. */
      appStoreUrl: MAGAZA.ios ? MAGAZA.appStore : '',
      playStoreUrl: MAGAZA.android ? MAGAZA.play : '',
    },
  },
  faq: {
    enabled: true,
    showOnLanding: true,
    title: 'Merak ettiklerin',
    intro: 'afiet’i yeni mi tanıyorsun? En çok sorulanları senin için bir araya getirdik.',
    items: [
      {
        q: 'afiet kalori saymadan nasıl çalışıyor?',
        a:
          'afiet kalori saydırmaz; sofranın kendi diliyle konuşur. Beş besin grubunu ' +
          'renklerle görürsün, gün dengelendikçe sofran tamamlanır. Kalori hedefi, ' +
          'kırmızı uyarı ya da suçluluk yok; sadece denge.',
        href: '/destek/baslangic/afiet-nedir',
      },
      {
        q: '“Dilim, kase, avuç” derken neyi kastediyorsunuz?',
        a:
          'Gram ve kalori yerine sofranın kendi ölçüleri: kaç dilim, kaç kase, bir avuç, ' +
          'bir fincan. Menemenden mercimeğe 2000’i aşkın Türk yemeği ve besin içeride ' +
          'hazır; sen sadece tabağını tarif edersin.',
        href: '/destek/ogun-kaydi/sofra-olculeri-dilim-kase-avuc',
      },
      {
        q: 'Afi kim, neler yapıyor?',
        a:
          'Afi, afiet’in sofra arkadaşı. Bilmediğin yemeğin fotoğrafını çekersin, Afi ' +
          'tanır ve kaydına yardım eder. Aklına takılanları da sorabilirsin; sofranın ' +
          'diliyle, kısaca anlatır.',
        href: '/destek/afi/afiye-fotografla-yemek-tanitma',
      },
      {
        q: 'afiet’i ailece kullanabilir miyiz?',
        a:
          'Evet. Soframız’da ailenle ya da arkadaşlarınla aynı sofrada yan yana ' +
          'durursunuz; kıyas ve sıralama yok. Herkesin kendi profili var, hepinizin ' +
          'aynı sofrası.',
        href: '/destek/soframiz/grup-kurma-ve-davet',
      },
      {
        q: 'afiet’i nasıl indiririm?',
        a:
          'afiet App Store’da yayında ve ücretsiz. iPhone’unda App Store’u açıp “afiet” ' +
          'diye arayabilir ya da afiet.co/indir adresinden doğrudan gidebilirsin. Android ' +
          'sürümü henüz Google Play’de değil, yolda.',
        href: '/indir',
      },
      {
        q: 'Verilerim nerede saklanıyor?',
        a:
          'Verilerin bizim yönettiğimiz sunucularda (Google Cloud, Avrupa bölgesi) saklanır; ' +
          'cihazınla sunucu arasındaki aktarım HTTPS ile şifrelenir. Reklam göstermeyiz, verini ' +
          'satmayız, seni izlemeyiz; yalnızca uygulamanın çalışması için gereken veriyi toplarız.',
        href: '/destek/hesap-gizlilik/verilerim-nerede-saklaniyor',
      },
      {
        q: 'Hesabımı ve verilerimi silebilir miyim?',
        a:
          'İstediğin zaman. Uygulamada menü → Hesap ayarlarım → Hesabı ve tüm verileri ' +
          'sil ile öğün, ölçü ve profil ' +
          'kayıtların kalıcı olarak silinir; işlem geri alınamaz. Uygulamaya erişemiyorsan ' +
          'destek@afiet.co adresine yazman yeterli; talebini en geç 30 gün içinde işleriz.',
        href: '/destek/hesap-gizlilik/hesabimi-silmek-istiyorum',
      },
      {
        q: 'afiet kimin için?',
        a:
          'afiet 13 yaş ve üzeri kullanıcılar içindir; bilerek 13 yaş altından veri toplamayız. ' +
          'Kalori saymadan, sofrada seni seven biri gibi konuşan bir arkadaş isteyen herkes için.',
        href: '/destek/baslangic/afiet-nedir',
      },
    ],
  },
}

/**
 * Destek merkezi kategori sayfaları. Tek tek yazmak yerine kategori
 * tanımından üretilir: kategori eklenince meta'sı ve site haritası girdisi
 * kendiliğinden gelir, panelde de düzenlenebilir olur (KNOWN_PATHS bu
 * nesnenin anahtarlarından türer).
 *
 * YAZI sayfalarının meta'sı burada değil, `seoStore.resolvePageMeta` içinde
 * yazının kendisinden türetilir (blog yazılarındaki yaklaşımın aynısı).
 */
const SUPPORT_CATEGORY_PAGES: Record<string, PageSeo> = Object.fromEntries(
  SUPPORT_CATEGORIES.map((c) => [
    `/destek/${c.slug}`,
    makePage({
      title: `${c.title} | afiet destek merkezi`,
      description: c.description,
      ogTitle: `${c.title} | afiet destek`,
      ogDescription: c.description,
      sitemap: { include: true, changefreq: 'weekly', priority: 0.5 },
    }),
  ]),
)

export const DEFAULT_PAGES: Record<string, PageSeo> = {
  '/': makePage({
    title: TITLE,
    description: DESCRIPTION,
    ogTitle: TITLE,
    ogDescription:
      'Kalori saydırmadan, Türk sofrasının diliyle ailece dengeli beslenme. ' +
      'Sofrada seni seven biri gibi konuşur. App Store’da yayında.',
    sitemap: { include: true, changefreq: 'weekly', priority: 1 },
  }),
  '/indir': makePage({
    title: 'afiet’i indir | App Store’da yayında',
    description:
      'afiet App Store’da yayında ve ücretsiz. iPhone’una indir, ilk öğününü sofranın ' +
      'kendi diliyle kaydet. Android sürümü yolda.',
    ogTitle: 'afiet’i indir',
    ogDescription:
      'afiet App Store’da yayında ve ücretsiz. Kalori saymadan, dilim kase avuçla ' +
      'dengeli beslenme. Android yolda.',
    sitemap: { include: true, changefreq: 'weekly', priority: 0.8 },
  }),
  '/blog': makePage({
    title: 'Blog | afiet',
    description:
      'Kalori saymadan dengeli beslenme, porsiyon ölçüleri ve aile sofrası üzerine ' +
      'rehberler; afiet günlüğü. Sofranın kendi diliyle: dilim, kase, avuç.',
    ogDescription:
      'afiet günlüğü: kalori saymadan dengeli beslenme rehberleri, porsiyon ölçüleri ' +
      've aile sofrası üzerine yazılar. Sayma, dengele.',
    sitemap: { include: true, changefreq: 'weekly', priority: 0.6 },
  }),
  '/gizlilik': makePage({
    title: 'Gizlilik Politikası | afiet',
    description:
      'afiet hangi verileri neden topladığını, nerede sakladığını (Google Cloud, ' +
      'Avrupa) ve verini nasıl sileceğini açıkça anlatır. Reklam yok, izleme yok, satış yok.',
    ogDescription:
      'afiet yalnızca uygulamanın çalışması için gereken veriyi toplar. Reklam yok, ' +
      'izleme yok, veri satışı yok. Verini istediğin zaman silebilirsin.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.3 },
  }),
  /* Mağazaların aradığı ikinci hukuki sayfa. Uygulamadaki paywall buraya
     bağlanır, yani bu yol 404 dönerse App Store 3.1.2'den red gelir. */
  '/kosullar': makePage({
    title: 'Kullanım Koşulları | afiet',
    description:
      'afiet’i kullanırken geçerli koşullar: hesap, afiet+ aboneliği ve iptali, ' +
      'yapay zekâ asistanlarının sınırları, sorumluluk ve uygulanacak hukuk.',
    ogDescription:
      'afiet bir sağlık hizmeti değildir ve kayıtların sana aittir. Abonelik, ' +
      'iptal ve sorumluluk kuralları bu sayfada.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.3 },
  }),
  '/durum': makePage({
    title: 'Sistem durumu | afiet',
    description:
      "afiet servislerinin anlık durumu ve 90 günlük çalışma oranları: uygulama sunucusu, " +
      'veritabanı, web sitesi, Afi yapay zekâ, kimlik doğrulama ve e-posta iletimi.',
    ogDescription:
      "afiet'in tüm servislerinin anlık durumu, geçmiş olaylar ve 90 günlük çalışma " +
      'oranları tek sayfada.',
    /*
     * SITEMAP'TEN ÇIKARILDI (24 Ağu 2026 denetimi). Sayfa yayında kalır ve
     * indekslenmeye açıktır (noindex DEĞİL), yalnız sitemap'te "şunu tara"
     * diye önerilmez.
     *
     * ÖLÇÜLEN SEBEP: `changefreq: daily` ile birlikte bu satır, en değerli
     * tarayıcının bütçesini sitenin en değersiz sayfasına akıtıyordu.
     * 11-24 Ağu arası OAI-SearchBot (ChatGPT aramasının indeksi) 35 istek
     * attı ve içerik olarak YALNIZ /durum'u çekti (8 kez); 160 URL'in
     * kalanından hiçbirini istemedi. Sunucu durum tablosu bir arama sonucu
     * ya da alıntı adayı değil.
     */
    sitemap: { include: false, changefreq: 'daily', priority: 0.3 },
  }),
  '/destek': makePage({
    title: 'Destek merkezi | afiet',
    description:
      'afiet uygulamasının kullanım rehberi: kurulum, öğün kaydı ve sofra ölçüleri, Afi, ' +
      'denge ve ritim, gruplar, hesap ve gizlilik, sürüm ve sorun giderme.',
    ogTitle: 'afiet destek merkezi',
    ogDescription:
      'Nasıl yardımcı olabiliriz? afiet’in kullanım rehberi, sorun giderme adımları ve ' +
      'sık sorulan soruların cevapları tek yerde.',
    sitemap: { include: true, changefreq: 'weekly', priority: 0.7 },
  }),
  ...SUPPORT_CATEGORY_PAGES,
  /* Yazar sayfası. Blog ve destek yazılarının Person şeması buraya bağlanır
     (shared/utils/author.ts), yani bu sayfa yalnız bir "hakkımızda" değil,
     yazar kimliğinin URL'idir: kaldırılırsa şemadaki `url`/`@id` boşa düşer. */
  '/hakkinda': makePage({
    title: 'Hakkında | afiet’i kim yazıyor?',
    description:
      'afiet’i kuran ve buradaki yazıları yazan kişi, yazıların hangi kaynaklara ' +
      'dayandığı ve neyi bilerek yapmadığımız: hedef kilo yok, süre vaadi yok, ' +
      'tıbbi tavsiye yok.',
    ogTitle: 'Bu yazıları kim yazıyor?',
    ogDescription:
      'Beslenme üzerine okuduğun her metnin arkasında bir insan var. afiet.co’da ' +
      'kim olduğumuzu ve neye dayanarak yazdığımızı açıkça anlatıyoruz.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.5 },
  }),
  '/iletisim': makePage({
    title: 'İletişim | afiet',
    description:
      'afiet ekibine ulaş: öneri, soru, sorun ya da iş birliği için bize bir kartpostal ' +
      'yaz. Her mesajı ürün ekibi okuyor ve dönüyor.',
    ogTitle: 'Bize bir kartpostal yaz',
    ogDescription:
      'Öneri, soru, sorun ya da iş birliği: ne yazarsan yaz, gerçek bir insan okur ve ' +
      'döner. Sofrana afiyet.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.4 },
  }),
  /* Bülten onay/çıkış: token'lı işlem sayfaları. Dizine girmez, sitemap'te
     yer almaz; meta yalnız sekme başlığı içindir. */
  '/bulten/onay': makePage({
    title: 'Bülten aboneliği | afiet',
    description: 'afiet bülten aboneliğini onayla.',
    robots: 'noindex, nofollow',
    sitemap: { include: false, changefreq: '', priority: null },
  }),
  '/bulten/cik': makePage({
    title: 'Bülten aboneliği | afiet',
    description: 'afiet bülteninden çık.',
    robots: 'noindex, nofollow',
    sitemap: { include: false, changefreq: '', priority: null },
  }),
  '/yenilikler': makePage({
    title: 'Sürüm notları | afiet',
    description:
      'afiet mobil uygulamasının sürüm geçmişi: her sürümde ne geldi, ne düzeldi ve ' +
      'neyin neden değiştiği. Uygulamadaki Yenilikler sayfasının uzun hâli.',
    ogTitle: 'afiet’te neler değişti?',
    ogDescription:
      'Her mobil sürümde ne geldiğini, ne düzeldiğini ve neyin neden değiştiğini ' +
      'anlatan sürüm notları.',
    sitemap: { include: true, changefreq: 'weekly', priority: 0.5 },
  }),
  '/hesapla': makePage({
    title: 'Hesaplama araçları | afiet',
    description:
      'Günlük enerji ve besin ihtiyacını hesapla, sonucu sofranın diliyle gör: kaç avuç ' +
      'içi protein, kaç yumruk sebze, kaç kapalı avuç tahıl. İdeal kilo vermiyoruz.',
    ogTitle: 'Sayıyı biz de biliyoruz. Sana tabağını veriyoruz.',
    ogDescription:
      'Çoğu hesaplayıcı bir kalori ve bir "ideal kilo" verip susar. afiet aynı hesabı ' +
      'yapar, sonra onu el ölçüsüne çevirir.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
  }),
  '/hesapla/vucut-kitle-indeksi': makePage({
    title: 'Vücut kitle indeksi hesaplama (VKİ) | afiet',
    description:
      'Boy ve kilodan vücut kitle indeksini hesapla. afiet yargısız bir aralık dili ' +
      'kullanır ve ideal kilo vermez; indeksin ne anlattığını ve neyi anlatamadığını söyler.',
    ogTitle: 'Vücut kitle indeksin kaç?',
    ogDescription:
      'Boy ve kilodan hesaplanan kaba bir gösterge. Sana dair bir hüküm değil; ' +
      'ideal kilo da vermiyoruz.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
  }),
  '/hesapla/gunluk-su': makePage({
    title: 'Günlük su ihtiyacı hesaplama | afiet',
    description:
      'Günde kaç bardak su içmelisin? Su ihtiyacı kilonun değil harcadığın enerjinin ' +
      'peşinden gider; afiet uygulamasındaki hesabın aynısı.',
    ogTitle: 'Günde ne kadar su içmelisin?',
    ogDescription:
      'Bardak ve litre olarak günlük su ihtiyacın. Bir bardağı 200 ml sayıyoruz.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
  }),
  '/hesapla/yag-orani': makePage({
    title: 'Vücut yağ oranı hesaplama | afiet',
    description:
      'Bel, boyun ve kalça çevresinden vücut yağ oranını ve yağsız kütleni hesapla ' +
      '(ABD Donanması yöntemi). Mezura yeter, tartıya gerek yok.',
    ogTitle: 'Vücut yağ oranın kaç?',
    ogDescription:
      'Mezura ölçülerinden yağ oranı ve yağsız kütle. Hüküm kuran bir bant göstermiyoruz.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
  }),
  '/hesapla/porsiyon-cevirici': makePage({
    title: 'Porsiyon hesaplama ve besin ölçüleri | afiet',
    description:
      'Bir besin sofrada hangi ölçüyle konuşur? İki binden fazla yemek ve besinin ' +
      'ölçüsü, gram karşılığı ve besin grubu. Bir dilim kaç gram, bir kase ne kadar?',
    ogTitle: 'Bu besin sofrada nasıl ölçülür?',
    ogDescription:
      'Besin ara, kendi ölçüsünü ve kaç grama denk geldiğini gör. İki binden fazla ' +
      'yemek ve besin hazır.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
  }),
  '/hesapla/sofra-payin': makePage({
    title: 'Günlük besin ihtiyacı hesaplama | afiet',
    description:
      'Boy, kilo, yaş ve hareket düzeyinden günlük tabağını el ölçüsüyle hesapla: ' +
      'avuç içi, yumruk, kapalı avuç, başparmak ve su. Kalori ve gram isteğe bağlı.',
    ogTitle: 'Günün nasıl görünmeli?',
    ogDescription:
      'Birkaç bilgi ver, günlük tabağını el ölçüsüyle görelim. Hedef kilo sormuyoruz, ' +
      'süre vaat etmiyoruz.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
  }),
  /* Basın kiti. Hedef okuru gazetecidir, arama kullanıcısı değil: meta'sı
     "afiet nedir" sorusuna değil "bu markanın basın malzemesi nerede"
     sorusuna cevap verir. Sayfanın kendisi indekslenir (altbilgiden bağlıdır)
     ama sitemap önceliği düşüktür. */
  '/basin': makePage({
    title: 'Basın kiti | afiet',
    description:
      'afiet basın kiti: logo paketi, uygulama ekran görüntüleri, tek cümlelik ' +
      'tanım, kurucu künyesi ve iletişim. Yayınlarda serbestçe kullanılabilir.',
    ogTitle: 'afiet basın kiti',
    ogDescription:
      'Logo, ekran görüntüleri, marka tanımı ve iletişim tek sayfada. ' +
      'Haber ve incelemelerde serbestçe kullanabilirsin.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.3 },
  }),
  '/hesap-sil': makePage({
    title: 'Hesabını sil | afiet',
    description:
      'afiet hesabını ve tüm verilerini istediğin zaman sil: uygulamada Profil → ' +
      'Hesabı sil ya da e-posta ile. Öğün, ölçü ve profil kayıtların kalıcı kaldırılır.',
    ogDescription:
      'afiet hesabını ve tüm verilerini uygulamadan ya da e-posta ile silmenin ' +
      'adımları. İşlem geri alınamaz; kayıtların kalıcı olarak kaldırılır.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.3 },
  }),
  /* ── İngilizce sayfalar (/en/*) ─────────────────────────────────────────
     TR kök URL'lere dokunulmaz; İngilizce /en altında yaşar. Hangi sayfanın
     çifti olduğu shared/utils/locales.ts > EN_BY_TR'de durur; hreflang ve
     sitemap alternates yalnız o haritadan üretilir. Çevirisi olmayan sayfaya
     /en yolu AÇILMAZ (TR içerik /en altında fallback servis edilmez). */
  '/en': makePage({
    title: 'afiet | Stop counting. Start balancing.',
    description:
      'Balanced eating without calorie counting: portions in slices, bowls and ' +
      'handfuls, five food groups as colors, the whole family at the same table. ' +
      'Born at the Turkish table; English version on the way.',
    ogTitle: 'afiet | Stop counting. Start balancing.',
    ogDescription:
      'Balanced eating without counting: hand-measure portions, five food groups ' +
      'as colors, no guilt. The app speaks Turkish today; English is on the way.',
    sitemap: { include: true, changefreq: 'weekly', priority: 0.7 },
  }),
  '/en/privacy': makePage({
    title: 'Privacy Policy | afiet',
    description:
      'What data afiet collects and why, where it is stored (Google Cloud, ' +
      'European region) and how to delete it. No ads, no tracking, no selling data.',
    ogDescription:
      'afiet only collects the data the app needs to work. No ads, no tracking, ' +
      'no selling data. You can delete your data at any time.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.3 },
  }),
  '/en/contact': makePage({
    title: 'Contact | afiet',
    description:
      'Reach the afiet team: write us a postcard with a suggestion, question, ' +
      'problem or partnership. A real person reads every message and replies.',
    ogTitle: 'Write us a postcard',
    ogDescription:
      'A suggestion, a question, a problem or a partnership: whatever you write, ' +
      'a real person reads it and replies.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.3 },
  }),
  '/en/delete-account': makePage({
    title: 'Delete your account | afiet',
    description:
      'Delete your afiet account and all your data at any time: in the app via ' +
      'My account settings, or by email. Records are removed permanently.',
    ogDescription:
      'The steps to delete your afiet account and all your data, from the app ' +
      'or by email. This cannot be undone.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.2 },
  }),
  /* İngilizce hesaplama araçları. Başlıklar aranan kalıbı taşır
     ("bmi calculator"), açıklamalar marka doktrinini tekrarlar: ideal kilo
     yok, hedef kilo yok, süre vaadi yok. */
  '/en/tools': makePage({
    title: 'Free health calculators | afiet',
    description:
      'Body mass index, daily water, body fat and daily portions: run the ' +
      'numbers, then see them as hand measures (palms, fists, cupped hands). ' +
      'No ideal weight, no sign-up, nothing leaves your browser.',
    ogTitle: 'We know the number too. We hand you your plate.',
    ogDescription:
      'Four free calculators that translate the maths into the language of the ' +
      'table: palms, fists, cupped hands and thumbs.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
  }),
  '/en/tools/daily-portions-calculator': makePage({
    title: 'Daily portion calculator (hand measures) | afiet',
    description:
      'How much should you eat a day? Get your daily plate in hand measures: ' +
      'palms of protein, fists of vegetables, cupped hands of grains, thumbs of ' +
      'fat. Calories optional, no goal weight, no timelines.',
    ogTitle: 'What should your day look like?',
    ogDescription:
      'Your daily plate in hand measures. We do not ask for a goal weight and ' +
      'promise no timelines.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
  }),
  '/en/tools/bmi-calculator': makePage({
    title: 'BMI calculator (metric and imperial) | afiet',
    description:
      'Calculate your body mass index from height and weight in ft/lb or cm/kg. ' +
      'afiet uses judgment-free range language and gives no ideal weight; it ' +
      'also says what the index cannot tell you.',
    ogTitle: 'What is your body mass index?',
    ogDescription:
      'A rough signal from height and weight. Not a verdict about you, and no ' +
      'ideal weight.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
  }),
  '/en/tools/daily-water-calculator': makePage({
    title: 'Daily water intake calculator | afiet',
    description:
      'How much water should you drink a day? Water needs follow the energy you ' +
      'burn, not weight alone. Get your daily intake in glasses, liters or fl oz.',
    ogTitle: 'How much water should you drink a day?',
    ogDescription:
      'Your daily water need in glasses. The same calculation the afiet app uses.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
  }),
  '/en/tools/body-fat-calculator': makePage({
    title: 'Body fat calculator (US Navy method) | afiet',
    description:
      'Estimate your body fat percentage and fat free mass from waist, neck and ' +
      'hip measurements. A tape measure is enough. No judgmental bands, no ' +
      '"ideal" label.',
    ogTitle: 'What is your body fat percentage?',
    ogDescription:
      'Body fat and fat free mass from tape measurements. We show the number and ' +
      'the direction, not a verdict.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.6 },
  }),
  /* İngilizce blog. `sitemap.include` bilinçli olarak FALSE: liste sayfası
     site haritasına yalnız İngilizce bir yazı yayınlandığında girer ve bunu
     sitemap route'u dinamik olarak ekler (kullanıcı kararı, 6 Ağu 2026 - içi
     boş bir liste sayfası indekslenmesin). Meta yine panelden yönetilebilir. */
  '/en/blog': makePage({
    title: 'Blog | afiet',
    description:
      'Guides on balanced eating without calorie counting, hand-measure ' +
      'portions and the family table. Written for the way people actually eat.',
    ogDescription:
      'Balanced eating without counting: hand-measure portions, five food groups ' +
      'and the family table.',
    sitemap: { include: false, changefreq: 'weekly', priority: 0.6 },
  }),
  /* İngilizce yazar sayfası. /en 6 Ağu 2026'da park edilmişti; bu sayfa
     bilinçli istisnadır (kullanıcı kararı, 11 Ağu 2026): /en/blog prod'da
     canlı olduğu için İngilizce yazının yazar bağlantısı da İngilizce bir
     sayfaya düşmeli, okur dil değiştirmeye zorlanmamalı. */
  '/en/about': makePage({
    title: 'About | who writes afiet',
    description:
      'Who founded afiet and writes these guides, which public health sources ' +
      'they follow, and what we deliberately never do: no target weight, no ' +
      'timelines, no medical advice.',
    ogTitle: 'Who writes these guides?',
    ogDescription:
      'There is a person behind every text you read about food. Here is who ' +
      'writes afiet and what the guides are based on.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.4 },
  }),
  /* Bülten onay/çıkışın İngilizce inişleri: TR'deki gibi dizin dışı. */
  '/en/press': makePage({
    title: 'Press kit | afiet',
    description:
      'afiet press kit: logo pack, app screenshots, the one-sentence ' +
      'description, founder details and contact. Free to use in coverage.',
    ogTitle: 'afiet press kit',
    ogDescription:
      'Logos, screenshots, the brand description and contact details on one ' +
      'page. Free to use in articles and reviews.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.3 },
  }),
  '/en/newsletter/confirm': makePage({
    title: 'Newsletter | afiet',
    description: 'Confirm your afiet newsletter subscription.',
    robots: 'noindex, nofollow',
    sitemap: { include: false, changefreq: '', priority: null },
  }),
  '/en/newsletter/leave': makePage({
    title: 'Newsletter | afiet',
    description: 'Leave the afiet newsletter.',
    robots: 'noindex, nofollow',
    sitemap: { include: false, changefreq: '', priority: null },
  }),
}

export function makePage(partial: Partial<PageSeo>): PageSeo {
  // Partial<PageSeo>['sitemap'] tam nesnedir - spread bütünüyle değiştirir.
  return {
    title: '',
    description: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    canonical: '',
    robots: '',
    jsonld: [],
    sitemap: { include: true, changefreq: '', priority: null },
    ...partial,
  }
}

/**
 * Kod varsayılanı yönlendirmeler (kullanıcı kararı, 24 Ağu 2026).
 *
 * NEDEN PANELDE DEĞİL: bunlar kampanya yönlendirmesi değil, YAPISAL ve KALICI
 * adres taşımalarıdır. Üç şey gerektiriyorlar ve panel üçünü de veremiyor:
 * dev/staging'de de çalışmaları (oralarda `seo_redirects` boştur), PR'da
 * gözden geçirilebilmeleri ve panelde bir "varsayılana dön" ile sessizce
 * düşmemeleri. Panelden gelen satır aynı `from` için bunun ÜSTÜNE yazar,
 * yani acil bir durumda hedef panelden değiştirilebilir.
 *
 * 24 Ağu 2026 taşınması: afiet App Store'da yayına girdi, beta kapandı.
 * `/beta` indirme sayfasına, `beta-sorun-giderme` kategorisi `sorun-giderme`
 * adına taşındı; beta'ya özgü üç yazı ile kurulum yazısı da yerini değiştirdi.
 * Yolların trafiği düşüktü (GSC 30 gün: toplam 25 gösterim, 0 tık) ama
 * indekste duruyorlar ve dışarıdan bağlantı verilmiş olabilir.
 */
export const DEFAULT_REDIRECTS: SeoRedirect[] = [
  { from: '/beta', to: '/indir', code: 301 },

  // Kurulum yazısı: beta davetiyle değil mağazadan kuruluyor artık.
  { from: '/destek/baslangic/beta-davetiyle-kurulum', to: '/destek/baslangic/afieti-indirmek', code: 301 },

  // Kategori adı: "Beta, sürüm ve sorun giderme" → "Sürüm ve sorun giderme".
  { from: '/destek/beta-sorun-giderme', to: '/destek/sorun-giderme', code: 301 },

  // Kategoride kalan 11 yazı: yalnız kategori parçası değişti.
  ...[
    'afi-fotografi-tanimiyor',
    'android-ne-zaman',
    'bir-sey-takildiginda',
    'geri-bildirimim-nereye-gidiyor',
    'kaydedemedik-uyarisi',
    'kayitlarim-gorunmuyor',
    'kesinti-mi-var-durum-sayfasi',
    'oturumun-sona-erdi',
    'surum-ve-yenilikler',
    'uygulamayi-guncellemek',
    'uygulama-acilmiyor-ya-da-takiliyor',
  ].map((slug) => ({
    from: `/destek/beta-sorun-giderme/${slug}`,
    to: `/destek/sorun-giderme/${slug}`,
    code: 301 as const,
  })),

  // Güncelleme yazısı TestFlight'a özgü olmaktan çıktı, slug'ı da değişti.
  { from: '/destek/beta-sorun-giderme/testflight-guncelleme', to: '/destek/sorun-giderme/uygulamayi-guncellemek', code: 301 },

  // Beta'ya özgü üç yazı kaldırıldı; karşılığı olan sayfaya taşınır.
  { from: '/destek/beta-sorun-giderme/beta-nasil-isliyor', to: '/indir', code: 301 },
  { from: '/destek/beta-sorun-giderme/beta-davetim-ne-zaman-gelir', to: '/indir', code: 301 },
  { from: '/destek/beta-sorun-giderme/beta-basvurumu-guncellemek', to: '/indir', code: 301 },
]

export const DEFAULT_BUNDLE: SeoBundle = {
  settings: DEFAULT_SETTINGS,
  pages: DEFAULT_PAGES,
  redirects: DEFAULT_REDIRECTS,
}

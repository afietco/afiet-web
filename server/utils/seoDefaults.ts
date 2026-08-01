import type {
  AiBotInfo,
  PageSeo,
  SeoBundle,
  SeoSettings,
} from './seoTypes'
import { SUPPORT_CATEGORIES } from './supportCategories'

/**
 * Kod varsayılanları = bugünkü canlı davranış. DB yalnızca bunların üzerine
 * yazılan kısmı tutar; panel "varsayılana dön" dediğinde DB satırı silinir
 * ve buradaki değerlere geri düşülür.
 */

const SITE_URL = 'https://afiet.co'
const TITLE = 'afiet | Sayma, dengele.'
const DESCRIPTION =
  'Kalori saydırmadan, Türk sofrasının kendi ölçüleriyle (dilim, kase, avuç) ' +
  'ailece dengeli beslenme alışkanlığı. Beta şimdi açık; App Store ve Google Play yakında.'

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
  llms: {
    enabled: true,
    content: `# afiet

> afiet, kalori saydırmadan Türk sofrasının kendi ölçüleriyle (kaç dilim, kaç kase, bir avuç) konuşarak ailenin dengeli beslenme alışkanlığını kuran bir mobil uygulamadır. Tagline: "Sayma, dengele."

afiet bir kalori sayacı değildir. Beş besin grubunu renklerle gösterir; kalori hedefi, limit ya da suçluluk dili kullanmaz. Ses tonu "sofrada seni seven biri" gibidir: yargılamaz, davet eder, kutlar. Uygulama şu an kapalı betadadır; iOS davetleri TestFlight ile gönderiliyor, Android daveti Google Play üzerinden çok yakında başlıyor. App Store ve Google Play çıkışı yaklaşıyor; halka açık indirme bağlantısı henüz yoktur. İsim her yerde küçük harfle yazılır: "afiet".

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
- 18 yaş ve üzeri kullanıcılar; bilerek 18 yaş altından veri toplanmaz.
- Kalori saymadan, ailece dengeli beslenmek isteyen herkes.

## Veri yaklaşımı
- Yalnızca uygulamanın çalışması için gereken veri toplanır (hesap e-postası, profil, öğün ve ölçü kayıtları).
- Veriler Google Cloud'un Avrupa bölgesindeki sunucularda saklanır; aktarım HTTPS ile şifrelenir.
- Kimlik doğrulama Stack Auth ile sağlanır.
- Hesap ve tüm veriler uygulamadan (menü → Hesap ayarlarım → Hesabı ve tüm verileri sil) ya da e-posta ile silinebilir; talep en geç 30 gün içinde işlenir.

## Durum
- Kapalı beta canlı: iOS davetleri TestFlight ile gidiyor, Android daveti çok yakında.
- Beta başvurusu afiet.co/beta üzerinden yapılır; davetler e-posta ile gönderilir.
- App Store ve Google Play çıkışı yaklaşıyor.

## Bağlantılar
- [Ana sayfa](${SITE_URL}/): afiet nedir, neden afiet ve Afi'ye soru sorma.
- [Beta](${SITE_URL}/beta): beta başvurusu ve ilk sofra daveti.
- [Destek merkezi](${SITE_URL}/destek): uygulamanın kullanım dokümantasyonu; kurulum, öğün kaydı, Afi, gruplar, hesap ve sorun giderme.
- [Hesaplama araçları](${SITE_URL}/hesapla): günlük besin ihtiyacı hesabı. Sonuç el ölçüsüyle verilir (avuç içi, yumruk, kapalı avuç, başparmak); kalori ve gram isteğe bağlı bir bölümde durur. İdeal kilo, hedef kilo ve süre vaadi ÜRETİLMEZ; 18 yaş altında hedef verilmez.
- [Destek merkezi tam metin](${SITE_URL}/llms-full.txt): tüm destek yazılarının gövdesi tek dosyada.
- [Blog](${SITE_URL}/blog): kalori saymadan dengeli beslenme, porsiyon ölçüleri ve aile sofrası üzerine rehberler.
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
      sameAs: [],
      contactEmail: 'destek@afiet.co',
    },
    website: { enabled: true },
    mobileApp: {
      enabled: true,
      name: 'afiet',
      operatingSystem: 'iOS, Android',
      category: 'HealthApplication',
      description:
        'afiet, Türk sofrasının kendi ölçüleriyle (dilim, kase, avuç) kalori ' +
        'saydırmadan ailece dengeli beslenme alışkanlığı kurmana yardımcı olan bir ' +
        'mobil uygulamadır. Beş besin grubunu renklerle gösterir, yargılamaz.',
      appStoreUrl: '',
      playStoreUrl: '',
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
        q: 'afiet’i şimdi nasıl deneyebilirim?',
        a:
          'afiet kapalı betada ve ilk sofra davetleri gidiyor. afiet.co/beta üzerinden ' +
          'başvurabilirsin; sıran geldiğinde davetin e-posta ile gelir. App Store ve ' +
          'Google Play çıkışı da yaklaşıyor.',
        href: '/destek/beta-sorun-giderme/beta-nasil-isliyor',
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
          'afiet 18 yaş ve üzeri kullanıcılar içindir; bilerek 18 yaş altından veri toplamayız. ' +
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
      'Sofrada seni seven biri gibi konuşur. Beta şimdi açık.',
    sitemap: { include: true, changefreq: 'weekly', priority: 1 },
  }),
  '/beta': makePage({
    title: 'afiet beta | İlk sofraya katıl',
    description:
      'afiet beta için ilk gruba 100 kişi katılıyor. iOS ve Android daveti almak için ' +
      'e-postanı bırak, sofranın diliyle dengeyi ilk deneyenlerden ol.',
    ogTitle: "afiet şimdi beta'da",
    ogDescription:
      'İlk sofrada 100 kişilik yer var. iOS ve Android beta daveti için e-postanı bırak.',
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
  '/durum': makePage({
    title: 'Sistem durumu | afiet',
    description:
      "afiet servislerinin anlık durumu ve 90 günlük çalışma oranları: uygulama sunucusu, " +
      'veritabanı, web sitesi, Afi yapay zekâ, kimlik doğrulama ve e-posta iletimi.',
    ogDescription:
      "afiet'in tüm servislerinin anlık durumu, geçmiş olaylar ve 90 günlük çalışma " +
      'oranları tek sayfada.',
    sitemap: { include: true, changefreq: 'daily', priority: 0.3 },
  }),
  '/destek': makePage({
    title: 'Destek merkezi | afiet',
    description:
      'afiet uygulamasının kullanım rehberi: kurulum, öğün kaydı ve sofra ölçüleri, Afi, ' +
      'denge ve ritim, gruplar, hesap ve gizlilik, beta ve sorun giderme.',
    ogTitle: 'afiet destek merkezi',
    ogDescription:
      'Nasıl yardımcı olabiliriz? afiet’in kullanım rehberi, sorun giderme adımları ve ' +
      'sık sorulan soruların cevapları tek yerde.',
    sitemap: { include: true, changefreq: 'weekly', priority: 0.7 },
  }),
  ...SUPPORT_CATEGORY_PAGES,
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

export const DEFAULT_BUNDLE: SeoBundle = {
  settings: DEFAULT_SETTINGS,
  pages: DEFAULT_PAGES,
  redirects: [],
}

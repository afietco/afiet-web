import type {
  AiBotInfo,
  PageSeo,
  SeoBundle,
  SeoSettings,
} from './seoTypes'

/**
 * Kod varsayılanları = bugünkü canlı davranış. DB yalnızca bunların üzerine
 * yazılan kısmı tutar; panel "varsayılana dön" dediğinde DB satırı silinir
 * ve buradaki değerlere geri düşülür.
 */

const SITE_URL = 'https://afiet.co'
const TITLE = 'afiet — Sayma, dengele.'
const DESCRIPTION =
  'Kalori saydırmadan, Türk sofrasının kendi ölçüleriyle — dilim, kase, avuç — ' +
  'ailece dengeli beslenme alışkanlığı. Yakında App Store ve Google Play’de.'

/**
 * AI botları — Temmuz 2026 durumu (kaynaklar: sağlayıcıların resmi crawler
 * dokümanları). purpose: egitim = model eğitimi (trafik getirmez),
 * arama = AI arama indeksi/alıntı (GEO görünürlüğünün kaynağı),
 * kullanici = kullanıcı-tetikli canlı getirme.
 */
export const AI_BOTS: AiBotInfo[] = [
  { agent: 'OAI-SearchBot', owner: 'OpenAI', purpose: 'arama', note: 'ChatGPT Search alıntıları — GEO için kritik' },
  { agent: 'ChatGPT-User', owner: 'OpenAI', purpose: 'kullanici', note: 'Kullanıcı link paylaşınca anlık getirme' },
  { agent: 'GPTBot', owner: 'OpenAI', purpose: 'egitim', note: 'Model eğitimi; engellemek arama görünürlüğünü etkilemez' },
  { agent: 'Claude-SearchBot', owner: 'Anthropic', purpose: 'arama', note: 'Claude arama indeksi' },
  { agent: 'Claude-User', owner: 'Anthropic', purpose: 'kullanici', note: 'Kullanıcı sorusu için sayfa çekme' },
  { agent: 'ClaudeBot', owner: 'Anthropic', purpose: 'egitim', note: 'Model eğitimi' },
  { agent: 'PerplexityBot', owner: 'Perplexity', purpose: 'arama', note: 'Perplexity alıntı indeksi' },
  { agent: 'Perplexity-User', owner: 'Perplexity', purpose: 'kullanici', note: 'Canlı getirme (robots.txt’e her zaman uymayabiliyor)' },
  { agent: 'Google-Extended', owner: 'Google', purpose: 'egitim', note: 'Gemini eğitimi kontrol token’ı; Arama/AI Overviews’u ETKİLEMEZ' },
  { agent: 'Applebot-Extended', owner: 'Apple', purpose: 'egitim', note: 'Apple Intelligence eğitim izni; Siri/Spotlight’ı etkilemez' },
  { agent: 'meta-externalagent', owner: 'Meta', purpose: 'egitim', note: 'Meta AI — eğitim + getirme karışık' },
  { agent: 'Amazonbot', owner: 'Amazon', purpose: 'arama', note: 'Alexa/Rufus yanıtları' },
  { agent: 'MistralAI-User', owner: 'Mistral', purpose: 'kullanici', note: 'Le Chat canlı getirme' },
  { agent: 'DuckAssistBot', owner: 'DuckDuckGo', purpose: 'arama', note: 'DuckAssist özetleri' },
  { agent: 'CCBot', owner: 'Common Crawl', purpose: 'egitim', note: 'Açık veri seti — birçok modele dolaylı kaynak' },
  { agent: 'Bytespider', owner: 'ByteDance', purpose: 'egitim', note: 'Agresif, uyumsuzluk geçmişi var — varsayılan engelli' },
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
    ogImageAlt: 'afiet — Sayma, dengele. Sofra illüstrasyonlu tanıtım görseli',
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

afiet bir kalori sayacı değildir. Beş besin grubunu renklerle gösterir; kalori hedefi, limit ya da suçluluk dili kullanmaz. Ses tonu "sofrada seni seven biri" gibidir: yargılamaz, davet eder, kutlar. Uygulama henüz yayında değildir — yakında App Store ve Google Play’de. Fiyat bilgisi ve indirme linki henüz yoktur. İsim her yerde küçük harfle yazılır: "afiet".

## afiet ne yapar
- Türk sofrasının ölçüleriyle konuşur: dilim, kase, avuç, fincan (gram ya da kalori değil).
- Beş besin grubunu renklerle gösterir; gün dengelendikçe sofra tamamlanır.
- Menemenden mercimeğe Türk yemekleri uygulamada hazırdır.
- Ailece kullanılır: herkesin kendi profili, hepsinin aynı sofrası.
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
- Veriler Google Cloud’un Avrupa bölgesindeki sunucularda saklanır; aktarım HTTPS ile şifrelenir.
- Kimlik doğrulama Stack Auth ile sağlanır.
- Hesap ve tüm veriler uygulamadan (Profil → Hesabı sil) ya da e-posta ile silinebilir; talep en geç 30 gün içinde işlenir.

## Durum
- Henüz yayında değil; yakında App Store ve Google Play’de.
- Çıkış haberi için afiet.co’daki bekleme listesine e-posta bırakılabilir.

## Bağlantılar
- [Ana sayfa](${SITE_URL}/): afiet nedir, neden afiet ve bekleme listesi.
- [Blog](${SITE_URL}/blog): kalori saymadan dengeli beslenme, porsiyon ölçüleri ve aile sofrası üzerine rehberler.
- [Gizlilik Politikası](${SITE_URL}/gizlilik): toplanan veriler, nerede saklandığı ve silme.
- [Hesabını sil](${SITE_URL}/hesap-sil): hesabı ve verileri silme adımları.
- İletişim: rberkkaratas@gmail.com
`,
  },
  schema: {
    organization: {
      enabled: true,
      name: 'afiet',
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
      sameAs: [],
      contactEmail: 'rberkkaratas@gmail.com',
    },
    website: { enabled: true },
    mobileApp: {
      enabled: true,
      name: 'afiet',
      operatingSystem: 'iOS, Android',
      category: 'HealthApplication',
      description:
        'afiet, Türk sofrasının kendi ölçüleriyle — dilim, kase, avuç — kalori ' +
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
          'kırmızı uyarı ya da suçluluk yok — sadece denge.',
      },
      {
        q: '“Dilim, kase, avuç” derken neyi kastediyorsunuz?',
        a:
          'Gram ve kalori yerine sofranın kendi ölçüleri: kaç dilim, kaç kase, bir avuç, ' +
          'bir fincan. Menemenden mercimeğe Türk sofrası içeride hazır; sen sadece ' +
          'tabağını tarif edersin.',
      },
      {
        q: 'afiet’i ailece kullanabilir miyiz?',
        a:
          'Evet. Herkesin kendi profili var, ama hepinizin aynı sofrası. Alışkanlık yalnız ' +
          'kurulmaz; afiet’te birlikte kurulur, birlikte kutlanır.',
      },
      {
        q: 'afiet ne zaman ve nerede çıkacak?',
        a:
          'afiet yakında App Store ve Google Play’de. Çıkış gününü kaçırmamak için ' +
          'afiet.co’da e-postanı bırakabilirsin; çıktığı gün ilk sana yazarız. Spam yok, ' +
          'ne zaman istersen çıkarsın.',
      },
      {
        q: 'Verilerim nerede saklanıyor?',
        a:
          'Verilerin bizim yönettiğimiz sunucularda (Google Cloud, Avrupa bölgesi) saklanır; ' +
          'cihazınla sunucu arasındaki aktarım HTTPS ile şifrelenir. Reklam göstermez, verini ' +
          'satmaz, seni izlemeyiz — yalnızca uygulamanın çalışması için gereken veriyi toplarız.',
      },
      {
        q: 'Hesabımı ve verilerimi silebilir miyim?',
        a:
          'İstediğin zaman. Uygulamada Profil → Hesabı sil ile öğün, ölçü ve profil ' +
          'kayıtların kalıcı olarak silinir; işlem geri alınamaz. Uygulamaya erişemiyorsan ' +
          'rberkkaratas@gmail.com adresine yazman yeterli; talebini en geç 30 gün içinde işleriz.',
      },
      {
        q: 'afiet kimin için?',
        a:
          'afiet 18 yaş ve üzeri kullanıcılar içindir; bilerek 18 yaş altından veri toplamayız. ' +
          'Kalori saymadan, sofrada seni seven biri gibi konuşan bir arkadaş isteyen herkes için.',
      },
    ],
  },
}

export const DEFAULT_PAGES: Record<string, PageSeo> = {
  '/': makePage({
    title: TITLE,
    description: DESCRIPTION,
    ogTitle: TITLE,
    ogDescription:
      'Kalori saydırmadan, Türk sofrasının diliyle ailece dengeli beslenme. ' +
      'Sofrada seni seven biri gibi konuşur. Yakında App Store ve Google Play’de.',
    sitemap: { include: true, changefreq: 'weekly', priority: 1 },
  }),
  '/blog': makePage({
    title: 'Blog — afiet',
    description:
      'Kalori saymadan dengeli beslenme, porsiyon ölçüleri ve aile sofrası üzerine ' +
      'rehberler — afiet günlüğü. Sofranın kendi diliyle: dilim, kase, avuç.',
    ogDescription:
      'afiet günlüğü: kalori saymadan dengeli beslenme rehberleri, porsiyon ölçüleri ' +
      've aile sofrası üzerine yazılar. Sayma, dengele.',
    sitemap: { include: true, changefreq: 'weekly', priority: 0.6 },
  }),
  '/gizlilik': makePage({
    title: 'Gizlilik Politikası — afiet',
    description:
      'afiet hangi verileri neden topladığını, nerede sakladığını (Google Cloud, ' +
      'Avrupa) ve verini nasıl sileceğini açıkça anlatır. Reklam yok, izleme yok, satış yok.',
    ogDescription:
      'afiet yalnızca uygulamanın çalışması için gereken veriyi toplar. Reklam yok, ' +
      'izleme yok, veri satışı yok. Verini istediğin zaman silebilirsin.',
    sitemap: { include: true, changefreq: 'monthly', priority: 0.3 },
  }),
  '/hesap-sil': makePage({
    title: 'Hesabını sil — afiet',
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
  // Partial<PageSeo>['sitemap'] tam nesnedir — spread bütünüyle değiştirir.
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

/**
 * Sayfanın tüm metin içeriği tek yerde — kopya değişikliği bileşenlere dokunmaz.
 * Ses tonu kuralları: afiet-mobile/BRAND.md ("sofrada seni seven biri";
 * sen dili, yargı yok, davet ve kutlama var).
 */

export type Accent = 'sebze' | 'meyve' | 'protein' | 'tahil' | 'sut'

export const hero = {
  eyebrow: 'Ailece dengeli beslenme',
  titleA: 'Sayma,',
  titleB: 'dengele.',
  sub:
    'afiet kalori saydırmaz. Sofranın kendi diliyle konuşur — kaç dilim, ' +
    'kaç kase, bir avuç — ve ailece dengeli beslenmeyi tatlı bir alışkanlığa çevirir.',
  ctaPrimary: 'Çıkınca haber ver',
  ctaSecondary: 'Neden afiet?',
}

/** Hero'da telefonun etrafında süzülen ölçü çipleri (uygulamanın ölçü dili). */
export const measureChips: { label: string; accent: Accent }[] = [
  { label: '2 dilim', accent: 'meyve' },
  { label: 'yarım kase', accent: 'tahil' },
  { label: 'bir avuç', accent: 'sebze' },
  { label: '1 fincan', accent: 'sut' },
]

export const zagsIntro = {
  eyebrow: 'Neden afiet?',
  title: 'Çünkü sofra sayı saymaz.',
}

export const zags: { key: string; title: string; body: string; accent: Accent }[] = [
  {
    key: 'denge',
    title: 'Sayı değil, denge',
    body:
      'Kalori hedefi, kırmızı uyarı, suçluluk yok. Beş besin grubunu renklerle ' +
      'görürsün; gün dengelendikçe sofran tamamlanır.',
    accent: 'sebze',
  },
  {
    key: 'sofra',
    title: 'Sofranın diliyle',
    body:
      'Gram ve kalori değil: kaç dilim, kaç kase, bir avuç. Menemenden ' +
      'mercimeğe Türk sofrası içeride hazır.',
    accent: 'tahil',
  },
  {
    key: 'aile',
    title: 'Birlikte, ailece',
    body:
      'Herkesin kendi profili, hepinizin aynı sofrası. Alışkanlık yalnız ' +
      'kurulmaz; birlikte kurulur, birlikte kutlanır.',
    accent: 'meyve',
  },
  {
    key: 'sefkat',
    title: 'Şefkatle',
    body:
      'afiet yargılamaz. Kaçırdığın günde “yarın yeni bir sofra” der, ' +
      'denge gününde seninle sevinir.',
    accent: 'sut',
  },
]

export const voice = {
  eyebrow: 'Ses tonu',
  title: 'Sofrada seni seven biri gibi konuşur',
  sub: 'Uyarı değil davet, suçluluk değil kutlama. afiet’in dili böyle:',
  messages: [
    'Günaydın! Bugün sebzeye yer açılır mı? 🌿',
    'Afiyet olsun! 🎉 İlk kaydını yaptın.',
    'Sofran seni özledi 🍲',
    'Bugün afiyetteydin — beş grup tamam 💚',
  ],
}

export interface WaitlistCopy {
  formPlaceholder: string
  formButton: string
  formSending: string
  formDone: string
  formDoneSub: string
  formExists: string
  formExistsSub: string
  formInvalid: string
  formError: string
  formSoon: string
  privacy: string
}

export const cta: WaitlistCopy & { title: string; sub: string } = {
  title: 'afiet yakında cebinde',
  sub:
    'App Store ve Google Play’e geliyor. E-postanı bırak, ' +
    'çıktığı gün ilk sen öğren.',
  formPlaceholder: 'e-posta adresin',
  formButton: 'Haber ver',
  formSending: 'Gönderiliyor…',
  formDone: 'Afiyet olsun, listedesin!',
  formDoneSub: 'Çıktığı gün ilk sana yazacağız. 🎉',
  formExists: 'Zaten listedesin 💚',
  formExistsSub: 'Seni unutmadık — sofrada yerin hazır.',
  formInvalid: 'Geçerli bir e-posta girer misin? 🌿',
  formError: 'Bir şey ters gitti — birazdan yeniden dener misin?',
  formSoon: 'Bekleme listesi çok yakında burada 🌱',
  privacy: 'Sadece çıkış haberi için. Spam yok, ne zaman istersen çıkarsın.',
}

export const beta = {
  eyebrow: 'beta daveti',
  title: "afiet şimdi beta'da.",
  sub:
    'Sofranın diliyle konuşan afiet’i gerçek hayatında deneyip bize ilk ses verenlerden ol.',
  cohortLabel: 'ilk sofra',
  cohortCount: '100',
  cohortSuffix: 'kişi',
  platforms: 'iOS ve Android aynı anda',
  cta: 'Sofrada yerini ayır',
  note: 'Halka açık indirme bağlantısı yok. Davetini e-posta ile göndereceğiz.',
  motifLabel: 'ilk sofradaki yerler',
  featuresEyebrow: 'beta’da ne var?',
  featuresTitle: 'Gerçek sofrada çalışan üç temel akış',
  featuresSub:
    'Gününü hesap tablosuna çevirmeden kaydet, ritmini gör ve sevdiklerinle aynı sofrada buluş.',
  features: [
    {
      key: 'kayit',
      number: '01',
      title: 'Sofranın diliyle kayıt',
      body:
        'Mercimek çorbasını gramla değil, kaseyle yaz. Afi bilmediğin yemeğe fotoğraftan bakmana yardım etsin.',
    },
    {
      key: 'ritim',
      number: '02',
      title: 'Afiyet ritmi',
      body:
        'Haftanı kusursuzlukla değil, kendi ritminle gör. Her yeni sofra yeni bir başlangıç olsun.',
    },
    {
      key: 'sofra',
      number: '03',
      title: 'Soframız',
      body:
        'Ailenle veya arkadaşlarınla aynı sofrada yan yana dur. Kıyas yok, sıralama yok.',
    },
  ],
  tester: {
    eyebrow: 'birlikte deneyelim',
    title: 'Sen kullan, biz dikkatle dinleyelim.',
    intro:
      'Beta, bitmiş ürün gösterisi değil. Gerçek sofrada nelerin iyi çalıştığını ve nerede pürüz çıktığını birlikte görmek için.',
    asksTitle: 'Senden beklediğimiz',
    asks: [
      'afiet’i bir hafta kendi sofranda kullanman',
      'Kısa geri bildirim formunu doldurman',
      'Karşılaştığın pürüzleri açıkça paylaşman',
    ],
    promisesTitle: 'Bizden bekleyebileceğin',
    promises: [
      'iOS ve Android için aynı başlangıç günü',
      'Davet ve kurulum adımlarının e-posta ile gelmesi',
      'Her geri bildirimin ürün ekibi tarafından okunması',
    ],
  },
  invite: {
    eyebrow: 'ilk grup',
    title: 'İlk sofrada 100 kişilik yer var.',
    sub:
      'iOS ve Android beta davetleri aynı anda başlayacak. E-postanı bırak, sıran geldiğinde kurulum adımlarını gönderelim.',
    platformIos: 'iOS',
    platformIosSub: 'TestFlight daveti',
    platformAndroid: 'Android',
    platformAndroidSub: 'Google Play beta daveti',
  },
  faqEyebrow: 'merak ettiklerin',
  faqTitle: 'Beta hakkında kısa cevaplar',
  faq: [
    {
      q: 'Beta nedir?',
      a:
        'afiet’in yayın öncesi sürümünü gerçek hayatında deneyip geri bildirim vereceğin ilk kullanım dönemi.',
    },
    {
      q: 'Beta ücretli mi?',
      a: 'Hayır. Beta kullanımı ücretsizdir.',
    },
    {
      q: 'Hangi telefonlarda çalışacak?',
      a:
        'iOS ve Android beta aynı anda başlayacak. iOS daveti TestFlight, Android daveti Google Play üzerinden gelecek.',
    },
    {
      q: 'Davet ne zaman gelir?',
      a:
        'İlk grup 100 kişiyle sınırlı. Sıran geldiğinde daveti ve kurulum adımlarını e-posta ile göndereceğiz.',
    },
    {
      q: 'Listeden nasıl çıkarım?',
      a:
        'Beta e-postalarından çıkmak istersen rberkkaratas@gmail.com adresine yazman yeterli.',
    },
  ],
}

/**
 * Beta başvuru formu (çok adımlı). Zorunlu: e-posta, platform, hedef, onay.
 * Gerisi isteğe bağlı. Sayı/kilo/kalori sormayız — marka gereği. Alan seçenekleri
 * Türkiye kullanım verisine göre sıralı; `BetaForm.vue` bu yapıyı okur.
 */
export const betaForm = {
  stepNames: ['E-posta', 'Seni tanıyalım', 'Alışkanlıkların'],
  step1: {
    title: 'Beta davetin için e-postanı bırak',
    lead: 'İlk sofrada 100 kişilik yer var. Önce e-postan, sonra birkaç kısa soru.',
    emailLabel: 'E-posta adresin',
    emailPlaceholder: 'e-posta adresin',
    next: 'Devam',
  },
  step2: {
    title: 'Seni biraz tanıyalım',
    platformLabel: 'Hangi telefonu kullanıyorsun?',
    platforms: [
      { value: 'ios', label: 'iPhone' },
      { value: 'android', label: 'Android' },
    ],
    goalLabel: 'Ne daha çok olsun istersin?',
    goalHint: 'Birden fazla seçebilirsin',
    goals: [
      { value: 'enerji', label: 'Daha çok enerji' },
      { value: 'huzur', label: 'Yemekle daha huzurlu bir ilişki' },
      { value: 'cesitlilik', label: 'Daha çeşitli beslenme' },
      { value: 'ritim', label: 'Düzenli bir ritim' },
      { value: 'sofra', label: 'Sevdiklerimle daha çok sofra' },
      { value: 'oz-bakim', label: 'Kendime iyi bakmak' },
    ],
    countingLabel: 'Kalori sayan bir uygulama nasıl hissettirdi?',
    countingHint: 'İstersen yanıtla',
    counting: [
      { value: 'yoruyor', label: 'Hâlâ kullanıyorum ama yoruyor' },
      { value: 'biraktim', label: 'Bıraktım, bunaltıcıydı' },
      { value: 'iyi-geldi', label: 'İşe yaradı, iyi geldi' },
      { value: 'hic', label: 'Hiç kullanmadım' },
    ],
    back: 'Geri',
    next: 'Devam',
  },
  step3: {
    title: 'Alışkanlıkların ve iletişim',
    lead: 'Hepsi isteğe bağlı, dilersen bu adımı atla.',
    appsLabel: 'Şu an neleri kullanıyorsun?',
    appsHint: 'Uygulama veya cihaz, birden fazla seçebilirsin',
    appGroups: [
      {
        key: 'nutrition',
        label: 'Kalori / beslenme',
        options: [
          { value: 'fatsecret', label: 'FatSecret' },
          { value: 'yazio', label: 'Yazio' },
          { value: 'myfitnesspal', label: 'MyFitnessPal' },
          { value: 'diyetkolik', label: 'Diyetkolik' },
          { value: 'lifesum', label: 'Lifesum' },
          { value: 'diyetisyen', label: 'Diyetisyen uygulaması' },
          { value: 'hicbiri', label: 'Hiçbirini kullanmıyorum' },
        ],
      },
      {
        key: 'activity',
        label: 'Spor / adım',
        options: [
          { value: 'samsung-health', label: 'Samsung Health' },
          { value: 'google-fit', label: 'Google Fit' },
          { value: 'apple-fitness', label: 'Apple Fitness / Sağlık' },
          { value: 'strava', label: 'Strava' },
          { value: 'huawei-health', label: 'Huawei Health' },
          { value: 'nike-run', label: 'Nike Run Club' },
          { value: 'adidas-running', label: 'adidas Running' },
          { value: 'adimsayar', label: 'Adımsayar' },
          { value: 'hicbiri', label: 'Hiçbirini kullanmıyorum' },
        ],
      },
      {
        key: 'body',
        label: 'Vücut / kilo / cihaz',
        options: [
          { value: 'apple-health', label: 'Apple Health' },
          { value: 'xiaomi-scale', label: 'Xiaomi akıllı tartı' },
          { value: 'apple-watch', label: 'Apple Watch' },
          { value: 'xiaomi-band', label: 'Xiaomi / Amazfit bileklik' },
          { value: 'huawei-wear', label: 'Huawei saat / bileklik' },
          { value: 'galaxy-watch', label: 'Samsung Galaxy Watch' },
          { value: 'garmin', label: 'Garmin' },
          { value: 'fitbit', label: 'Fitbit' },
          { value: 'hicbiri', label: 'Hiçbirini kullanmıyorum' },
        ],
      },
    ],
    appsOtherPlaceholder: 'Listede yoksa yaz (isteğe bağlı)',
    contactLabel: 'Sana nasıl ulaşalım?',
    contact: [
      { value: 'eposta', label: 'E-posta' },
      { value: 'bildirim', label: 'Uygulama bildirimi' },
    ],
    heardLabel: 'Bizi nereden duydun?',
    heard: [
      { value: 'instagram', label: 'Instagram' },
      { value: 'arkadas', label: 'Bir arkadaşım' },
      { value: 'x', label: 'X (Twitter)' },
      { value: 'google', label: 'Google araması' },
      { value: 'tiktok', label: 'TikTok' },
      { value: 'baska', label: 'Başka' },
    ],
    consentText: 'Kaydolarak beta daveti ve ürün haberleri için bana ulaşmanıza izin veriyorum.',
    consentLinkLabel: 'Gizlilik',
    consentLinkHref: '/gizlilik',
    back: 'Geri',
    submit: 'Sofrada yerini ayır',
  },
  status: {
    sending: 'Gönderiliyor…',
    done: 'Sofrada yerin hazır!',
    doneSub: 'Davet sırası geldiğinde sana e-posta göndereceğiz. 🌿',
    exists: 'Başvurunu güncelledik 💚',
    existsSub: 'Davet sıranı koruyoruz, yerin duruyor.',
    soon: 'Beta başvuruları çok yakında burada 🌱',
    error: 'Bir şey ters gitti. Birazdan yeniden dener misin?',
    invalidEmail: 'Geçerli bir e-posta girer misin? 🌿',
    missingStep2: 'Telefonunu seç ve en az bir şey işaretle 🌿',
    consentRequired: 'Devam etmek için onay kutusunu işaretler misin? 🌿',
  },
}

export const footer = {
  tagline: 'Sayma, dengele.',
  signoff: 'Sofranıza afiyet.',
  links: [
    { label: 'Beta', to: '/beta' },
    { label: 'Blog', to: '/blog' },
    { label: 'Gizlilik', to: '/gizlilik' },
    { label: 'Hesabını sil', to: '/hesap-sil' },
  ],
}

/** Blog (afiet günlüğü) — liste ve yazı sayfası metinleri. */
export const blog = {
  eyebrow: 'afiet günlüğü',
  title: 'Sofradan notlar',
  sub:
    'Kalori saymadan dengeli beslenme, porsiyon ölçüleri ve aile sofrası üzerine ' +
    'kısa rehberler — sofranın kendi diliyle.',
  rss: 'RSS ile takip et',
  empty: 'İlk yazı fırında — çok yakında burada. 🌿',
  back: '← Tüm yazılar',
  readingSuffix: 'dk okuma',
}

/**
 * Yasal sayfalar (herkese açık — mağaza ve KVKK/Play için). İçerik GERÇEĞE
 * uygundur: uygulama hesap gerektirir ve veriyi backend'de saklar; eski
 * "yalnızca bu cihazda" metni artık geçerli DEĞİL.
 */
export const privacy = {
  title: 'Gizlilik Politikası',
  effective: '13 Temmuz 2026',
  contact: 'rberkkaratas@gmail.com',
  intro:
    'afiet, ailenin beslenme ve sağlık alışkanlıklarını takip etmene yardımcı olur. ' +
    'Yalnızca uygulamanın çalışması için gereken veriyi toplarız; reklam, izleme ya da ' +
    'üçüncü taraflara satış yoktur.',
  sections: [
    {
      title: 'Topladığımız veriler',
      body: [
        'Hesap: e-posta adresin — kimlik doğrulama için (sağlayıcı: Stack Auth).',
        'Profil: görünen adın, cinsiyetin, doğum tarihin, boyun ve aktivite düzeyin.',
        'Sağlık ve beslenme: öğün ve besin kayıtların, besin grupları, su tüketimin, ' +
          'vücut ölçülerin (kilo, bel, boyun, kalça) ve bunlardan hesaplanan BMI, BMR, ' +
          'TDEE gibi değerler.',
        'Kullanım: kayıt tarihlerin ve seri (streak) gibi uygulama içi etkinliğin.',
      ],
    },
    {
      title: 'Verileri neden işliyoruz',
      body: [
        'Yalnızca uygulamanın çalışması için: kayıtlarını saklamak, aile profillerini ' +
          'yönetmek ve sana dengeli beslenme özetleri göstermek.',
        'Reklam göstermiyoruz, verini satmıyoruz, üçüncü taraflarla paylaşmıyoruz ve ' +
          'seni izlemiyoruz.',
      ],
    },
    {
      title: 'Web sitesi analitiği (afiet.co)',
      body: [
        'afiet.co ziyaretlerini anlamak için dış araç (Google Analytics vb.) kullanmadan, ' +
          'kendi sunucumuzda topladığımız birinci-taraf, anonim ve toplu istatistik tutarız: ' +
          'hangi sayfalar görüntülendi, ziyaretçiler nereden geldi (arama/sosyal/bağlantı), ' +
          'yaklaşık ülke, cihaz ve tarayıcı türü.',
        'Bunun için tarayıcına kimliğini içermeyen rastgele bir çerez (afiet_vid / afiet_sid) ' +
          'yazılır; yalnız tekil ziyaretçiyi tahmini saymak içindir. IP adresini saklamaz, ' +
          'üçüncü taraflarla paylaşmaz, reklam için kullanmaz ve seni sitelerarası izlemeyiz.',
        'Analitik yalnız açık onayınla çalışır: ilk ziyaretinde çıkan bilgilendirmede "Reddet" ' +
          'diyebilir, tarayıcının "İzleme yok" (Do Not Track) ayarını açabilir ya da çerezleri ' +
          'silerek istatistiğe dahil olmayı durdurabilirsin.',
      ],
    },
    {
      title: 'Nerede saklanır',
      body: [
        'Verilerin, bizim yönettiğimiz sunucularda (Google Cloud, Avrupa bölgesi) ' +
          'saklanır; cihazınla sunucu arasındaki aktarım HTTPS ile şifrelenir.',
        'Kimlik doğrulama Stack Auth tarafından sağlanır.',
      ],
    },
    {
      title: 'Verini silme',
      body: [
        'Hesabını ve tüm verilerini uygulamadan silebilirsin: Profil → Hesabı sil. ' +
          'Bu işlem öğün, ölçü ve profil kayıtlarını kalıcı olarak kaldırır.',
        'Dilersen rberkkaratas@gmail.com adresine yazarak da silme talep edebilirsin; ' +
          'talebini en geç 30 gün içinde işleriz.',
      ],
    },
    {
      title: 'Çocuklar',
      body: [
        'afiet 18 yaş ve üzeri kullanıcılar içindir. Bilerek 18 yaş altından veri ' +
          'toplamayız.',
      ],
    },
    {
      title: 'Değişiklikler',
      body: [
        'Bu politikayı zaman zaman güncelleyebiliriz; önemli değişiklikleri bu sayfada ' +
          'duyururuz. Yürürlük tarihi yukarıda yazılıdır.',
      ],
    },
    {
      title: 'İletişim',
      body: ['Sorular ve talepler için: rberkkaratas@gmail.com'],
    },
  ],
}

export const hesapSil = {
  title: 'Hesabını sil',
  contact: 'rberkkaratas@gmail.com',
  intro:
    'Hesabını ve afiet’teki tüm verilerini istediğin zaman silebilirsin. En hızlısı ' +
    'uygulama içinden; erişemiyorsan e-posta ile de talep edebilirsin.',
  appTitle: 'Uygulamadan (en hızlı)',
  steps: [
    'afiet uygulamasını aç ve giriş yap.',
    'Profil sekmesine git.',
    'Hesap bölümünde “Hesabı sil”e dokun ve onayla.',
    'Öğün, ölçü ve profil kayıtların dâhil tüm verilerin kalıcı olarak silinir; ' +
      'işlem geri alınamaz.',
  ],
  emailTitle: 'E-posta ile',
  emailBody:
    'Uygulamaya erişemiyorsan, kayıtlı e-posta adresinden rberkkaratas@gmail.com ' +
    'adresine “hesap silme” yaz. Kimliğini doğruladıktan sonra hesabını ve tüm ' +
    'verilerini en geç 30 gün içinde sileriz.',
}

/**
 * Auth yardımcı sayfaları (/sifre-yenile/{env}, /e-posta-dogrula/{env}):
 * Stack Auth e-postalarındaki bağlantıların iniş noktası. Ton sakin ve
 * yargısız; teknik detay, hata dökümü ya da İngilizce API metni gösterilmez.
 */
export const authOrtak = {
  checking: 'Bağlantı kontrol ediliyor…',
  invalidTitle: 'Bu bağlantı geçerli değil',
  invalidBody:
    'Bağlantı eksik ya da hatalı görünüyor. E-postandaki bağlantıya yeniden ' +
    'dokunmayı deneyebilirsin.',
}

export const sifreYenile = {
  title: 'Yeni şifreni belirle',
  label: 'Yeni şifren',
  hint: 'En az 8 karakter',
  button: 'Şifreyi güncelle',
  sending: 'Güncelleniyor…',
  doneTitle: 'Şifren güncellendi',
  doneBody: 'Uygulamaya dönüp yeni şifrenle giriş yapabilirsin. Afiyet olsun!',
  expiredTitle: 'Bu bağlantı artık geçerli değil',
  expiredBody:
    'Bağlantının süresi dolmuş ya da daha önce kullanılmış. Uygulamadaki ' +
    'giriş ekranından yeni bir bağlantı isteyebilirsin.',
  errTooShort: 'Şifre en az 8 karakter olmalı.',
  errGeneric: 'Bir şeyler ters gitti, tekrar dene.',
}

export const epostaDogrula = {
  doneTitle: 'E-postan doğrulandı 🎉',
  doneBody: 'Uygulamaya dönebilirsin. Afiyet olsun!',
  expiredTitle: 'Bu bağlantı artık geçerli değil',
  expiredBody:
    'Bağlantının süresi dolmuş ya da daha önce kullanılmış. Uygulamadan ' +
    'yeni bir doğrulama e-postası isteyebilirsin.',
}

/**
 * Grup davet inişi (/katil/{code}): uygulamadaki GroupHome’un paylaştığı
 * davet linkinin karşılama noktası. afiet yüklüyse bağlantı doğrudan
 * uygulamada açılır (universal link) ve bu sayfa hiç görünmez; görünüyorsa
 * kullanıcının uygulaması yok ya da bağlantı tarayıcıda açıldı demektir.
 * Ton sakin ve davetkâr; kod büyük gösterilir ki elle de girilebilsin.
 */
export const katil = {
  eyebrow: 'grup daveti',
  title: 'Bir gruba davet edildin',
  sub: 'afiet’te sofraya birlikte oturun. Dengeyi ailece kovalayın.',
  codeLabel: 'Grup ID’si',
  openApp: 'Uygulamada aç',
  openHint: 'afiet yüklüyse bu buton uygulamada açar ve seni gruba katılma adımına götürür.',
  noAppTitle: 'afiet’in yok mu?',
  noAppBody:
    'App Store ve Google Play’de çok yakında. İndirdikten sonra Grubum ' +
    'sekmesinde “ID ile katıl”a dokun ve bu kodu gir. Sofrada yerin hazır.',
  invalidTitle: 'Bu bağlantı geçerli değil',
  invalidBody:
    'Davet kodu eksik ya da hatalı görünüyor. Grubu kuran kişiden davet ' +
    'bağlantısını yeniden paylaşmasını isteyebilirsin.',
}

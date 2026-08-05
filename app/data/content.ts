/**
 * Sayfanın tüm metin içeriği tek yerde - kopya değişikliği bileşenlere dokunmaz.
 * Ses tonu kuralları: afiet-mobile/BRAND.md ("sofrada seni seven biri";
 * sen dili, yargı yok, davet ve kutlama var). Uzun tire (em dash) kullanılmaz.
 */

export type Accent = 'sebze' | 'meyve' | 'protein' | 'tahil' | 'sut'

export const hero = {
  eyebrow: 'Ailece dengeli beslenme',
  titleA: 'Sayma,',
  titleB: 'dengele.',
  sub:
    'afiet kalori saydırmaz. Sofranın kendi diliyle konuşur (kaç dilim, ' +
    'kaç kase, bir avuç) ve ailece dengeli beslenmeyi tatlı bir alışkanlığa çevirir.',
  ctaPrimary: 'Beta’ya katıl',
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
      'mercimeğe 2000’i aşkın yemek ve besin içeride hazır.',
    accent: 'tahil',
  },
  {
    key: 'afi',
    title: 'Afi yanında',
    body:
      'Bilmediğin yemeğin fotoğrafını çek, Afi tanısın. Aklına takılanı sor, ' +
      'sofranın diliyle anlatsın.',
    accent: 'protein',
  },
  {
    key: 'ritim',
    title: 'Kendi ritminle',
    body:
      'Kusursuz hafta değil, senin ritmin. Haftanı afiyet günleriyle görürsün; ' +
      'her sofra yeni bir başlangıçtır.',
    accent: 'meyve',
  },
  {
    key: 'aile',
    title: 'Birlikte, ailece',
    body:
      'Herkesin kendi profili, hepinizin aynı sofrası. Alışkanlık yalnız ' +
      'kurulmaz; birlikte kurulur, birlikte kutlanır.',
    accent: 'sut',
  },
  {
    key: 'sefkat',
    title: 'Şefkatle',
    body:
      'afiet yargılamaz. Kaçırdığın günde “yarın yeni bir sofra” der, ' +
      'denge gününde seninle sevinir.',
    accent: 'sebze',
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
    'Bugün afiyetteydin, beş grup tamam 💚',
  ],
}

/**
 * Sayfa sonu çağrısı: doğrudan BETA başvurusuna yönlendirir. Uygulama artık
 * beta'da ve ilk sofrada sınırlı yer var, dolayısıyla e-posta toplayıp
 * "çıkınca haber veririz" demek yerine katılmaya çağırıyoruz. Landing'de
 * başka e-posta toplama noktası YOK; tek dizin /beta formudur.
 */
export const cta = {
  title: 'afiet şimdi beta’da',
  sub:
    'İlk sofrada 100 kişilik yer var. Sen de kendi sofranda dene, ' +
    'ne işe yarayıp yaramadığını birlikte görelim.',
  betaCta: 'Sofrada yerini ayır',
  betaTo: '/beta',
  betaNote: 'Davetin e-posta ile gelir.',
}

/**
 * Ana sayfa vitrin bölümleri: hesap araçları, taze blog yazıları ve son sürüm
 * şeridi. Araç kartlarının kaynağı `hesapla.tools`tur (tek liste, iki görünüm);
 * blog ve sürüm verisi kendi API'lerinden akar, boşsa bölüm hiç görünmez.
 */
export const homeHesapla = {
  eyebrow: 'hesaplama araçları',
  title: 'Sayı mı lazım? Tabağına çevirelim.',
  sub:
    'Beş küçük araç: hesabı yapar, sonucu sofranın diline çevirir. ' +
    'Üyelik yok; girdiğin hiçbir şey tarayıcından çıkmaz.',
  cta: 'Tüm araçları gör',
}

export const homeBlog = {
  eyebrow: 'blog',
  title: 'Sofradan taze yazılar',
  sub: 'Dengeli beslenmeyi sofranın diliyle anlatıyoruz: yargısız, kalorisiz, uygulanabilir.',
  cta: 'Tüm yazıları gör',
  readingSuffix: 'dk okuma',
}

export const homeYenilikler = {
  label: 'Taze çıktı',
  linkLabel: 'Neler değişti?',
}

/**
 * "Afi'ye sor" paneli - ana sayfada kendi bölümü, beta sayfasında SSS'in
 * kardeşi. Cevaplar backend'den akar; buradaki metinler yalnızca çerçevedir.
 *
 * Marka: Afi'nin üzgün ya da endişeli hâli YOKTUR (BRAND.md > Logo). Hata,
 * sınır ve kota durumlarında bile ton davetkârdır, suçlayıcı değildir.
 * Bu blokta uzun tire kullanılmaz.
 */
export const askAfi = {
  eyebrow: 'Afi burada',
  title: 'Aklına takılan başka bir şey var mı?',
  // SSS listesi varken başlık yerine bu tek satır görünür (iki başlık üst üste gelmesin).
  attachedLead: 'Cevabını yukarıda bulamadın mı? Afi’ye sor, sofranın diliyle anlatsın.',
  invitation: 'Merhaba, ben Afi. afiet’le ilgili ne merak ediyorsan sor, kısaca anlatayım.',
  chipsLabel: 'Şunları sorabilirsin',
  chips: [
    'afiet kalori saymadan nasıl çalışıyor?',
    'Ailece nasıl kullanırız?',
    'Beta’ya nasıl katılırım?',
  ],
  moreChips: 'Başka bir şey sor',
  inputLabel: 'Afi’ye sorun',
  placeholder: 'afiet’e dair ne merak ediyorsun?',
  send: 'Sor',
  sending: 'Gönderiliyor…',
  stop: 'Dur',
  retry: 'Yeniden sor',
  thinking: 'Afi düşünüyor…',
  answering: 'Afi yazıyor…',
  hint: 'Afi genel bilgi verir, sağlık tavsiyesi vermez. Sağlık bilgini yazma.',
  privacyLabel: 'Sorular nasıl saklanıyor?',
  privacyTo: '/gizlilik',
  error: 'Afi şu an cevap veremedi. Birazdan yeniden sorar mısın?',
  slow: 'Afi biraz düşünceye daldı. İstersen yeniden sor.',
  limit: 'Bugünlük soru hakkın doldu. Yarın Afi yine burada olacak. 🌿',
  cap: 'Bu sohbet burada tamamlandı. Merakın sürüyorsa beta’ya katıl, Afi uygulamada seninle devam etsin.',
  capCta: 'Sofrada yerini ayır',
  capCtaTo: '/beta',
  unknownBetaCta: 'Beta’ya katıl',
  unknownBlogCta: 'Blogda anlattıklarımız',
  captchaCheck: 'Bir saniye, gerçek bir sofra arkadaşı olduğunu doğruluyoruz.',
  captchaFailed: 'Doğrulama tamamlanamadı. Biraz sonra yeniden sorar mısın?',
  soon: 'Afi’ye soru sorma çok yakında burada 🌱',
}

export const beta = {
  eyebrow: 'beta daveti',
  title: "afiet şimdi beta'da.",
  sub:
    'Sofranın diliyle konuşan afiet’i gerçek hayatında deneyip bize ilk ses verenlerden ol.',
  cohortLabel: 'ilk sofra',
  cohortCount: '100',
  cohortSuffix: 'kişi',
  platforms: 'iOS başladı, Android yakında',
  cta: 'Sofrada yerini ayır',
  note: 'Davetin e-posta ile gelir.',
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
      'Beta boyunca düzenli yeni sürümler',
      'Davet ve kurulum adımlarının e-posta ile gelmesi',
      'Her geri bildirimin ürün ekibi tarafından okunması',
    ],
  },
  invite: {
    eyebrow: 'ilk grup',
    title: 'İlk sofrada 100 kişilik yer var.',
    sub:
      'iOS davetleri TestFlight ile gidiyor; Android daveti Google Play üzerinden ' +
      'çok yakında. E-postanı bırak, sıran geldiğinde kurulum adımlarını gönderelim.',
    platformIos: 'iOS',
    platformIosSub: 'TestFlight daveti',
    platformAndroid: 'Android',
    platformAndroidSub: 'Google Play beta daveti (yakında)',
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
      q: 'Hangi telefonlarda çalışıyor?',
      a:
        'iOS davetleri TestFlight üzerinden gidiyor. Android daveti Google Play ' +
        'üzerinden çok yakında başlayacak.',
    },
    {
      q: 'Davet ne zaman gelir?',
      a:
        'İlk grup 100 kişiyle sınırlı. Sıran geldiğinde daveti ve kurulum adımlarını ' +
        'e-posta ile göndeririz.',
    },
    {
      q: 'Listeden nasıl çıkarım?',
      a:
        'Beta e-postalarından çıkmak istersen destek@afiet.co adresine yazman yeterli.',
    },
  ],
}

/**
 * Beta başvuru formu (çok adımlı). Zorunlu: e-posta, platform, hedef, onay.
 * Gerisi isteğe bağlı. Sayı/kilo/kalori sormayız - marka gereği. Alan seçenekleri
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
      { value: 'enerji', label: 'Gün boyu daha enerjik hissetmek' },
      { value: 'huzur', label: 'Yemek konusunda suçluluk hissetmemek' },
      { value: 'cesitlilik', label: 'Daha çeşitli ve dengeli beslenmek' },
      { value: 'ritim', label: 'Sürdürebileceğim bir beslenme düzeni' },
      { value: 'sofra', label: 'Ailemle birlikte sağlıklı beslenmek' },
      { value: 'kilo', label: 'Kilomu sağlıklı şekilde yönetmek' },
    ],
    countingLabel: 'Daha önce kullandığın kalori sayan uygulamalar nasıl hissettirdi?',
    countingHint: 'İstersen yanıtla',
    counting: [
      { value: 'yoruyor', label: 'Hâlâ kullanıyorum ama beni yoruyor' },
      { value: 'biraktim', label: 'Bıraktım, bunaltıcıydı' },
      { value: 'iyi-geldi', label: 'İşe yaradı, memnun kaldım' },
      { value: 'hic', label: 'Hiç kullanmadım' },
    ],
    back: 'Geri',
    next: 'Devam',
  },
  step3: {
    title: 'Alışkanlıkların',
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
          { value: 'fitatu', label: 'Fitatu' },
          { value: 'loseit', label: 'Lose It!' },
          { value: 'noom', label: 'Noom' },
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
          { value: 'mi-fitness', label: 'Mi Fitness (Zepp)' },
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
          { value: 'withings', label: 'Withings' },
          { value: 'akilli-tarti', label: 'Akıllı tartı (diğer)' },
          { value: 'hicbiri', label: 'Hiçbirini kullanmıyorum' },
        ],
      },
    ],
    // Her grubun sonunda "Başka..." çipi: seçilince o gruba özel metin kutusu açılır.
    appsOtherChip: 'Başka…',
    appsOtherPlaceholder: 'Kullandığını yaz',
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
    { label: 'Destek', to: '/destek' },
    { label: 'Hesapla', to: '/hesapla' },
    { label: 'Yenilikler', to: '/yenilikler' },
    { label: 'İletişim', to: '/iletisim' },
    { label: 'Gizlilik', to: '/gizlilik' },
  ],
  /**
   * Dış profiller (SocialIcons.vue `rel="me"` ile basar; footer + /iletisim).
   *
   * TEK KAYNAK DEĞİL: buraya eklenen her adres `server/utils/seoDefaults.ts`
   * içindeki `schema.organization.sameAs` listesine de girmelidir. Görünür link
   * kullanıcıya, sameAs arama motoruna aynı kimliği söyler; biri eksikse sinyal
   * yarım kalır. Adres eklerken ikisini birlikte değiştir. ⚠️ Prod'da
   * `seo_settings.schema` override'ı varsayılanı EZER: listeyi panelden
   * (admin.afiet.co > Analitik > SEO & GEO) de güncellemek gerekir.
   *
   * Hesaplar 3 Ağu 2026'da açıldı (afiet-brand/GERILLA-30-GUN.md § 7);
   * LinkedIn şirket sayfası 5 Ağu'da eklendi, dev.to aynı gün listeden
   * ÇIKARILDI (kullanıcı kararları). Var olmayan profile link VERİLMEZ.
   * `icon` anahtarı SocialIcons.vue'daki çizimi seçer. Hashnode adresi
   * blog alan adıdır (afiet.hashnode.dev), profil sayfası değil.
   */
  social: [
    { label: 'Instagram', href: 'https://www.instagram.com/afiet.co/', icon: 'instagram' },
    { label: 'Medium', href: 'https://medium.com/@afiet.co', icon: 'medium' },
    { label: 'Substack', href: 'https://afiet.substack.com', icon: 'substack' },
    { label: 'Hashnode', href: 'https://afiet.hashnode.dev', icon: 'hashnode' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/afiet-app', icon: 'linkedin' },
  ] as { label: string; href: string; icon: SocialIcon }[],
}

export type SocialIcon = 'instagram' | 'medium' | 'substack' | 'hashnode' | 'linkedin'

/**
 * Bülten (kendi altyapımız: aboneler Neon'da, gönderim Resend API ile, dış
 * servis paneli yok). Çift onay: form → onay maili → /bulten/onay. Landing'in
 * e-posta toplama İSTİSNASIDIR ve bilinçlidir; /beta başvurusundan ayrı yaşar.
 * Kayıt noktaları: footer bandı, blog yazı sonu, /iletisim.
 */
export const bulten = {
  eyebrow: 'bülten',
  title: 'Sofradan mektubun olsun',
  sub:
    'Yeni yazılar, yeni sürümler ve sofradan kısa notlar; en fazla haftada bir, ' +
    'her zaman tek tıkla çıkışlı.',
  placeholder: 'e-posta adresin',
  submit: 'Abone ol',
  sending: 'Gönderiliyor…',
  success: 'Posta kutunu kontrol et: onay bağlantın yolda 💌',
  invalid: 'Geçerli bir e-posta girer misin? 🌿',
  error: 'Bir şey ters gitti. Birazdan yeniden dener misin?',
  kvkk: 'E-postanı yalnız bülten göndermek için kullanırız. Ayrıntı: gizlilik sayfası.',

  // Blog yazı sonu varyantı.
  blogTitle: 'Devamı posta kutuna gelsin',
  blogSub: 'Yeni yazı çıktığında ve sürüm notu düştüğünde kısaca haber verelim.',

  // Onay sayfası (/bulten/onay).
  confirmTitle: 'Sofraya hoş geldin 💚',
  confirmBody: 'Aboneliğin onaylandı. İlk mektup yolda; o zamana dek sofrana afiyet.',
  confirmFailTitle: 'Bu bağlantı çalışmadı',
  confirmFailBody:
    'Onay bağlantısı eskimiş ya da daha önce kullanılmış olabilir. ' +
    'İstersen aşağıdan yeniden abone olabilirsin.',

  // Çıkış sayfası (/bulten/cik).
  leaveTitle: 'Yolun açık olsun 🌿',
  leaveBody:
    'Aboneliğin sonlandı, bir daha mektup almazsın. Fikrini değiştirirsen ' +
    'sofrada her zaman yerin var.',
}

/**
 * İletişim sayfası (/iletisim): kartpostal metaforu. Mesaj Resend ile ekip
 * posta kutusuna düşer (beta bildirimleriyle aynı yol). KVKK bilinçli olarak
 * onay kutusu DEĞİL bilgilendirme satırıdır (kullanıcı kararı, 5 Ağu 2026).
 */
export const iletisim = {
  eyebrow: 'iletişim',
  title: 'Bize bir kartpostal yaz',
  sub:
    'Öneri, soru, sorun ya da iş birliği: ne yazarsan yaz, gerçek bir insan ' +
    'okur ve döner. Beta boyunca her mesajı ürün ekibi görüyor.',

  cardTo: 'Sevgili afiet,',
  stampLegend: 'Pulunu seç',
  topics: [
    { key: 'oneri', label: 'Öneri', accent: 'sebze' },
    { key: 'soru', label: 'Soru', accent: 'sut' },
    { key: 'sorun', label: 'Sorun', accent: 'tahil' },
    { key: 'isbirligi', label: 'İş birliği', accent: 'meyve' },
  ] as { key: string; label: string; accent: Accent }[],

  messageLabel: 'Mesajın',
  messagePlaceholder: 'Aklından ne geçiyorsa…',
  nameLabel: 'Kimden',
  namePlaceholder: 'adın (istersen)',
  emailLabel: 'E-posta',
  emailPlaceholder: 'sana dönebileceğimiz adres',
  submit: 'Postala',
  sending: 'Postalanıyor…',

  successTitle: 'Kartpostalın yolda 💌',
  successBody: 'Eline sağlık! En geç iki gün içinde döneriz. Sofrana afiyet.',
  successAgain: 'Bir kartpostal daha yaz',

  missingMessage: 'Kartpostal boş gitmesin: birkaç kelime yazar mısın? 🌿',
  invalidEmail: 'Geçerli bir e-posta girer misin? 🌿',
  error: 'Postane şu an cevap vermedi. Birazdan yeniden dener misin?',

  kvkk:
    'Postaladığında adını, e-postanı ve mesajını yalnızca sana dönmek için ' +
    'kullanırız; üçüncü kişiyle paylaşmayız. Ayrıntı: gizlilik sayfası.',

  socialTitle: 'Bizi şuralarda da bulursun',
  socialSub: 'Sofranın günlüğü ve perde arkası, ayrı ayrı tellerden.',
  mailTitle: 'Doğrudan yazmak istersen',
  mailBody: 'Kartpostal işi değilse aynı kapıya e-postayla da gelebilirsin:',
  mailAddress: 'destek@afiet.co',
}

/**
 * Destek merkezi metinleri. Yazıların kendisi `content/destek/**.md` içinde;
 * burası yalnız çerçevedir (hub, kategori ve yazı sayfasının sabit metinleri).
 *
 * Ton kuralı sorun giderme yazılarında da geçerlidir: suçlama yok, teknik
 * döküm yok, "yapamazsın" yok. Adım net, dil sıcak (BRAND.md > Ses tonu).
 */
export const support = {
  eyebrow: 'destek merkezi',
  title: 'Nasıl yardımcı olabiliriz?',
  sub: 'Aradığın cevabı ara kutusuna yaz ya da aşağıdaki başlıklardan ilerle.',
  searchLabel: 'Destek merkezinde ara',
  searchPlaceholder: 'Bir şey ara: kayıt, grup, bildirim…',
  searchHint: 'Aramak için / tuşuna basabilirsin',
  popularLabel: 'Sık sorulanlar',
  popular: [
    { label: 'Dilim, kase, avuç ne demek?', to: '/destek/ogun-kaydi/sofra-olculeri-dilim-kase-avuc' },
    { label: 'Öğünü nasıl silerim?', to: '/destek/ogun-kaydi/ogunu-duzenleme-ve-silme' },
    { label: 'Davetim geldi, nasıl kurarım?', to: '/destek/baslangic/beta-davetiyle-kurulum' },
    { label: 'Gruba nasıl katılırım?', to: '/destek/soframiz/gruba-katilma' },
    { label: 'Şifremi unuttum', to: '/destek/hesap-gizlilik/sifremi-unuttum' },
  ],
  categoriesTitle: 'Konu başlıkları',
  countSuffix: 'yazı',
  emptyCategory: 'Bu başlık için yazılar hazırlanıyor. 🌿',
  empty: 'Destek yazıları çok yakında burada. 🌿',

  // Arama kutusunun açılan sonuç listesi.
  resultsLabel: 'Arama sonuçları',
  noResultsTitle: 'Bu aramaya uyan yazı bulamadık.',
  noResultsBody: 'Başka bir kelimeyle deneyebilir ya da doğrudan Afi’ye sorabilirsin.',
  askAfiCta: 'Bunu Afi’ye soralım mı?',
  searching: 'Aranıyor…',

  // Hub'ın alt bölümü.
  askTitle: 'Aradığını bulamadın mı?',
  askSub: 'Afi burada. Sorunu yaz, sofranın diliyle kısaca anlatsın.',
  contactTitle: 'İnsana ulaş',
  contactBody:
    'Afi’nin çözemediği bir şey varsa bize yaz. Beta boyunca her mesajı ürün ekibi okuyor.',
  contactMail: 'destek@afiet.co',
  statusLabel: 'Bir kesinti mi var?',
  statusBody:
    'Uygulama ya da site beklediğin gibi çalışmıyorsa önce servislerin anlık ' +
    'durumuna bakabilirsin.',
  statusLinkLabel: 'Sistem durumunu gör',
  statusTo: '/durum',

  // Yazı sayfası.
  breadcrumbRoot: 'Destek',
  tocTitle: 'Bu sayfada',
  menuTitle: 'Konular',
  menuToggle: 'Konular arasında gezin',
  updatedPrefix: 'Son güncelleme',
  relatedTitle: 'İlgili yazılar',
  prevLabel: 'Önceki',
  nextLabel: 'Sonraki',
  stuckTitle: 'Hâlâ takıldın mı?',
  stuckBody: 'Afi’ye sorabilir ya da destek@afiet.co adresine yazabilirsin.',
  stuckAskCta: 'Afi’ye sor',
  backToCategory: 'Tüm başlığa dön',
  backToHub: 'Destek merkezi',

  // Yanıt oyu.
  voteQuestion: 'Bu yazı yardımcı oldu mu?',
  voteYes: 'Evet, oldu',
  voteNo: 'Pek olmadı',
  voteThanksYes: 'Sevindik, afiyet olsun 💚',
  voteThanksNo: 'Not aldık, bu yazıyı iyileştireceğiz. 🌿',
}

/**
 * Hesaplama araçları (/hesapla). Marka gerilimi bilinçlidir: ziyaretçi bir sayı
 * aramaya gelir, biz ona tabağını veririz. Kalori ve gram SAKLANMAZ ama öne de
 * konmaz; katlanmış bir bölümde durur (afiet-hedefler docs/hedeflerim.md § 12).
 *
 * Bu araçların ASLA yapmayacakları (§ 9 ve § 12, bağlayıcı):
 * ideal kilo, hedef kilo, süre vaadi, ondalıklı el ölçüsü, 18 yaş altına hedef.
 */
export const hesapla = {
  eyebrow: 'hesaplama',
  title: 'Sayıyı biz de biliyoruz. Sana tabağını veriyoruz.',
  sub:
    'Çoğu hesaplayıcı bir kalori ve bir "ideal kilo" verip susar. afiet ' +
    'aynı hesabı yapar, sonra onu sofranın diline çevirir: kaç avuç, kaç yumruk.',
  toolsTitle: 'Araçlar',
  soonLabel: 'Yakında',
  soonBody:
    'Sırada besin kataloğunun tamamını gezilebilir hâle getirmek ve ' +
    'araçları gerçek kullanımla ölçüp işe yaramayanı kaldırmak var.',

  /** Hub'daki araç kartları. `to` gerçek bir sayfaya işaret etmek zorunda. */
  tools: [
    {
      to: '/hesapla/sofra-payin',
      title: 'Sofra payın',
      body: 'Günlük tabağın el ölçüsüyle: kaç avuç içi, kaç yumruk, kaç kapalı avuç.',
      chips: ['3-4 avuç içi', '4-5 yumruk', '5-6 kapalı avuç'],
      accent: 'sebze',
    },
    {
      to: '/hesapla/vucut-kitle-indeksi',
      title: 'Vücut kitle indeksi',
      body: 'Boy ve kilodan indeks, yargısız bir aralık diliyle. İdeal kilo vermiyoruz.',
      chips: ['boy', 'kilo'],
      accent: 'tahil',
    },
    {
      to: '/hesapla/gunluk-su',
      title: 'Günlük su',
      body: 'Vücudunun günlük su ihtiyacı, bardak olarak. Uygulamadaki hesabın aynısı.',
      chips: ['bardak', 'litre'],
      accent: 'sut',
    },
    {
      to: '/hesapla/porsiyon-cevirici',
      title: 'Porsiyon çevirici',
      body: 'Bir besin sofrada hangi ölçüyle konuşur? İki binden fazla besin hazır.',
      chips: ['dilim', 'kase', 'avuç'],
      accent: 'meyve',
    },
    {
      to: '/hesapla/yag-orani',
      title: 'Yağ oranı',
      body: 'Bel, boyun ve kalça ölçünden vücut yağ oranı ve yağsız kütle.',
      chips: ['bel', 'boyun', 'kalça'],
      accent: 'protein',
    },
  ],

  /** Tüm hesap sayfalarında ortak alt bilgi. */
  disclaimer:
    'Bu hesap yaklaşıktır ve tıbbi tavsiye değildir. Bir rahatsızlığın, ' +
    'alerjin ya da özel bir beslenme planın varsa hekimine ve diyetisyenine danış.',
  privacy: 'Girdiğin bilgiler tarayıcından çıkmaz; bize gönderilmez, saklanmaz.',
  errorMissing: 'Alanları doldurur musun? 🌿',
  errorRange: 'Bu değerleri bir kontrol eder misin? 🌿',

  /** Vücut kitle indeksi. */
  bmi: {
    slug: 'vucut-kitle-indeksi',
    eyebrow: 'vücut kitle indeksi',
    title: 'Vücut kitle indeksin kaç?',
    sub:
      'Boy ve kilodan hesaplanan kaba bir gösterge. Sana dair bir hüküm değil, ' +
      'bir nüfus ölçüsü; ideal kilo da vermiyoruz.',
    submit: 'İndeksimi göster',
    recalc: 'Yeniden hesapla',
    resultLabel: 'vücut kitle indeksin',
    rangeLabel: 'Bu değer şu aralıkta',
    context:
      'Vücut kitle indeksi kası ve yağı ayırt edemez. Kaslı biri "denge üstü", ' +
      'kas kütlesi düşük biri "denge aralığı" çıkabilir. Bu yüzden afiet bu sayıyı ' +
      'bir hedefe çevirmez; yalnız nerede durduğunu gösterir.',
    nextTitle: 'Peki tabağın nasıl görünmeli?',
    nextBody: 'İndeks bir fotoğraf. Günün nasıl kurulacağını sofra payın söyler.',
    nextCta: 'Sofra payıma bak',
  },

  /** Günlük su. */
  water: {
    slug: 'gunluk-su',
    eyebrow: 'günlük su',
    title: 'Günde ne kadar su içmelisin?',
    sub:
      'Su ihtiyacı kilonun değil, harcadığın enerjinin peşinden gider. ' +
      'Bu yüzden birkaç bilgi daha soruyoruz.',
    submit: 'Su ihtiyacımı göster',
    recalc: 'Yeniden hesapla',
    glassLabel: 'su',
    literLabel: 'yaklaşık',
    context:
      'Bir bardağı 200 ml sayıyoruz. Sıcak havada, spor yaptığında ve ' +
      'hastalandığında ihtiyacın artar; çay ve kahve de sıvı sayılır ama ' +
      'suyun yerini tutmaz.',
    nextTitle: 'Suyu takip etmek',
    nextBody: 'afiet günlük suyunu tek dokunuşla sayar, hatırlatır ve zorlamaz.',
    nextCta: 'Sofrada yerini ayır',
  },

  /** Yağ oranı. */
  fat: {
    slug: 'yag-orani',
    eyebrow: 'yağ oranı',
    title: 'Vücut yağ oranın kaç?',
    sub:
      'Bel, boyun ve kalça çevresinden hesaplanır (ABD Donanması yöntemi). ' +
      'Mezura yeter, tartıya gerek yok.',
    submit: 'Oranımı göster',
    recalc: 'Yeniden hesapla',
    ratioLabel: 'yağ oranın',
    ffmLabel: 'yağsız kütlen',
    howTitle: 'Ölçüyü nasıl alırım',
    howSteps: [
      'Mezurayı cilde değecek kadar yaklaştır ama sıkma.',
      'Bel: göbek deliğinin hizasından, nefesini tutmadan ölç.',
      'Boyun: gırtlağın hemen altından, mezura hafif aşağı eğimli dursun.',
      'Kalça: en geniş yerinden ölç.',
    ],
    context:
      'Bu yöntem bir tahmindir ve birkaç puanlık hata payı taşır. Aynı koşullarda ' +
      'ölçtüğünde yönü doğru gösterir; tek bir ölçümü hüküm gibi okuma.',
    implausible:
      'Bu ölçülerden makul bir oran çıkmadı. Mezurayı ve girdiğin sayıları bir ' +
      'kontrol eder misin?',
    nextTitle: 'Ölçülerini takip etmek',
    nextBody:
      'afiet ölçülerini saklar ve yönünü zamanla gösterir; tek bir sayının ' +
      'üstüne hüküm kurmaz.',
    nextCta: 'Sofrada yerini ayır',
  },

  /** Porsiyon çevirici. */
  portion: {
    slug: 'porsiyon-cevirici',
    eyebrow: 'porsiyon çevirici',
    title: 'Bu besin sofrada nasıl ölçülür?',
    sub:
      'Bir besin ara, kendi ölçüsünü ve kaç grama denk geldiğini gör. ' +
      'Kataloğumuzda iki binden fazla yemek ve besin var.',
    searchLabel: 'Besin ara',
    searchPlaceholder: 'Mercimek çorbası, beyaz peynir, karpuz…',
    loading: 'Katalog yükleniyor…',
    noResults: 'Bu aramaya uyan besin bulamadık. Başka bir kelimeyle dener misin?',
    hint: 'Yazmaya başla, katalog açılsın.',
    countSuffix: 'besin',
    measureTitle: 'Ölçüsü',
    quantityLabel: 'Miktar',
    gramLabel: 'yaklaşık',
    groupsTitle: 'Hangi besin gruplarına sayılır',
    coreNote: 'Kalın yazılanlar günün beş temel grubundan.',
    numbersToggle: 'Sayıları göster',
    numbersNote:
      'Bu değerler seçtiğin miktar için. Katalogdaki sayılar ortalamadır; ' +
      'aynı yemeğin evden eve değiştiğini biz de biliyoruz.',
    kcalLabel: 'Enerji',
    proteinLabel: 'Protein',
    carbLabel: 'Karbonhidrat',
    fatLabel: 'Yağ',
    fiberLabel: 'Lif',
    context:
      'afiet kayıt alırken de bu ölçüleri kullanır. Gram istemiyoruz; ' +
      'sen kaç dilim, kaç kase dersin, gerisini uygulama halleder.',
    nextTitle: 'Bunu her gün yaşamak',
    nextBody:
      'Tek tek çevirmek zorunda değilsin. afiet besini seçtiğinde ölçüyü ' +
      'kendisi getirir; sen yalnız miktarı söylersin.',
    nextCta: 'Sofrada yerini ayır',
  },

  // ── Sofra payın ──────────────────────────────────────────────────────────
  plate: {
    slug: 'sofra-payin',
    eyebrow: 'sofra payın',
    title: 'Günün nasıl görünmeli?',
    sub:
      'Birkaç bilgi ver, sana günlük tabağını el ölçüsüyle anlatalım. ' +
      'Hedef kilo sormuyoruz, süre vaat etmiyoruz.',

    formTitle: 'Seni tanıyalım',
    sexLabel: 'Cinsiyet',
    ageLabel: 'Yaş',
    heightLabel: 'Boy',
    weightLabel: 'Kilo',
    activityLabel: 'Gün içinde ne kadar hareket edersin?',
    submit: 'Tabağımı göster',
    recalc: 'Yeniden hesapla',

    resultTitle: 'Günün böyle görünür',
    handNote:
      'Ölçü senin kendi elin. Bu yüzden boyuna ve vücuduna göre zaten ' +
      'ölçekleniyor; ayrıca bir düzeltme yapmana gerek yok.',
    waterLabel: 'su',
    numbersToggle: 'Sayıları göster',
    numbersNote:
      'Bunlar aralıktır, hedef değil. afiet gün içinde bu sayıları sana ' +
      'saydırmaz; burada duruyorlar çünkü merak etmek en doğal şey.',
    kcalLabel: 'Günlük enerji',
    basalLabel: 'Bazal (dinlenirken)',
    proteinLabel: 'Protein',
    carbLabel: 'Karbonhidrat',
    fatLabel: 'Yağ',
    fiberLabel: 'Lif',

    minorTitle: 'Sana bir hedef vermeyeceğiz',
    minorBody:
      'Bu yaşta beslenme değerlendirmesi yaş persentilleriyle yapılır, bir ' +
      'formülle değil. Denge dili yine senin için geçerli: günde beş besin ' +
      'grubuna da yer açmaya çalış, gerisi zamanla oturur.',

    ctaTitle: 'Bunu her gün yaşamak',
    ctaBody:
      'Tek seferlik bir hesap alışkanlık kurmuyor. afiet bu tabağı sabah ' +
      'hatırlatır, akşam tamamlandı mı gösterir ve seni yargılamaz.',
    ctaButton: 'Sofrada yerini ayır',

  },
}

/** Blog (afiet günlüğü) - liste ve yazı sayfası metinleri. */
export const blog = {
  eyebrow: 'afiet günlüğü',
  title: 'Sofradan notlar',
  sub:
    'Kalori saymadan dengeli beslenme, porsiyon ölçüleri ve aile sofrası üzerine ' +
    'kısa rehberler; sofranın kendi diliyle.',
  rss: 'RSS ile takip et',
  empty: 'İlk yazı fırında, çok yakında burada. 🌿',
  back: '← Tüm yazılar',
  readingSuffix: 'dk okuma',
  searchLabel: 'Yazılarda ara',
  searchPlaceholder: 'Bir konu ara: porsiyon, kahvaltı, denge...',
  sortLabel: 'Sırala',
  sortNew: 'En yeni',
  sortOld: 'En eski',
  noResults: 'Bu aramaya uyan yazı bulamadık. Başka bir kelimeyle dener misin?',
  pagesLabel: 'Blog sayfaları',
  pagePrev: 'Önceki sayfa',
  pageNext: 'Sonraki sayfa',
}

/**
 * Sürüm notları (/yenilikler). Notların kendisi `content/yenilikler/*.md`
 * içinde; burası yalnız çerçevedir.
 *
 * Bu sayfanın uygulama içindeki karşılığı mobildeki "Yenilikler" alt
 * sayfasıdır: orada kısa özet, burada tamamı. Dil aynı olmalı, yani
 * "sürüm yayınlandı" değil "şunu artık yapabiliyorsun".
 */
export const releases = {
  eyebrow: 'sürüm notları',
  title: 'afiet’te neler değişti?',
  sub:
    'Her mobil sürümde ne geldiğini, ne düzeldiğini ve neyin neden değiştiğini burada ' +
    'tutuyoruz. Uygulamadaki Yenilikler sayfası kısa özeti gösterir; uzun hâli burası.',
  latestLabel: 'En yeni sürüm',
  listLabel: 'Önceki sürümler',
  empty: 'Sürüm notları çok yakında burada. 🌿',
  back: '← Tüm sürümler',
  readMore: 'Sürümün tamamını oku',
  newerLabel: 'Daha yeni',
  olderLabel: 'Daha eski',
  changesSuffix: 'değişiklik',
  // Sürüm sayfasının altındaki iki kutu.
  updateTitle: 'Bu sürüm bende var mı?',
  updateBody:
    'Uygulamadaki menünün en altında hangi sürümde olduğun yazar. Güncelleme ' +
    'beta boyunca TestFlight üzerinden gelir.',
  updateLinkLabel: 'Güncelleme adımları',
  updateTo: '/destek/beta-sorun-giderme/testflight-guncelleme',
  helpTitle: 'Bir şey takıldı mı?',
  helpBody:
    'Yeni sürümde bir şey beklediğin gibi çalışmıyorsa destek merkezinde adım adım ' +
    'anlatılan yollar var; bulamazsan bize yazabilirsin.',
  helpLinkLabel: 'Destek merkezi',
  helpTo: '/destek',
  // Bilinmeyen bir sürüm numarası istendiğinde (yanıt 404'tür).
  notFoundTitle: 'Bu sürümün notlarını bulamadık',
  notFoundBody:
    'Aradığın sürümün notları henüz yayında olmayabilir ya da numara yanlış yazılmış ' +
    'olabilir. Yayındaki bütün sürümler tek listede duruyor.',
  notFoundCta: 'Tüm sürümlere bak',
}

/**
 * Yasal sayfalar (herkese açık - mağaza ve KVKK/Play için). İçerik GERÇEĞE
 * uygundur: uygulama hesap gerektirir ve veriyi backend'de saklar; eski
 * "yalnızca bu cihazda" metni artık geçerli DEĞİL.
 */
export const privacy = {
  title: 'Gizlilik Politikası',
  effective: '31 Temmuz 2026',
  contact: 'destek@afiet.co',
  intro:
    'afiet, ailenin beslenme ve sağlık alışkanlıklarını takip etmene yardımcı olur. ' +
    'Yalnızca uygulamanın çalışması için gereken veriyi toplarız; reklam, izleme ya da ' +
    'üçüncü taraflara satış yoktur.',
  sections: [
    {
      title: 'Topladığımız veriler',
      body: [
        'Hesap: e-posta adresin, kimlik doğrulama için (sağlayıcı: Stack Auth).',
        'Profil: görünen adın, cinsiyetin, doğum tarihin, boyun ve aktivite düzeyin.',
        'Sağlık ve beslenme: öğün ve besin kayıtların, besin grupları, su tüketimin, ' +
          'vücut ölçülerin (kilo, bel, boyun, kalça) ve bunlardan hesaplanan BMI, BMR, ' +
          'TDEE gibi değerler.',
        'Kullanım: kayıt tarihlerin ve seri (streak) gibi uygulama içi etkinliğin.',
        'Bildirimler: izin verirsen, hatırlatma ve duyuru gönderebilmek için cihazının ' +
          'anonim bildirim adresi (push token). Bildirimleri istediğin zaman cihaz ' +
          'ayarlarından kapatabilirsin.',
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
      title: 'Uygulamada Afi’ye fotoğraf gönderme',
      body: [
        'Bilmediğin bir yemeği Afi’ye fotoğrafla sorabilirsin. Fotoğraf, yalnızca ' +
          'yemeği tanıyabilmemiz için afiet’in kendi sunucusu üzerinden Microsoft ' +
          'Azure’un Avrupa bölgesindeki yapay zekâ servisine iletilir; orada model ' +
          'eğitimi için kullanılmaz.',
        'Fotoğrafların reklam için kullanılmaz ve üçüncü taraflarla paylaşılmaz.',
      ],
    },
    {
      title: 'Hata ve çökme kayıtları',
      body: [
        'Uygulama beklenmedik biçimde kapanırsa, sorunu bulup düzeltebilmemiz için ' +
          'teknik bir kayıt (cihaz modeli, işletim sistemi sürümü, hatanın olduğu ekran) ' +
          'Sentry hizmetiyle toplanır.',
        'Bu kayıtlarda öğün ya da sağlık verin yer almaz; kayıtlar reklam ya da ' +
          'profilleme için kullanılmaz.',
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
        'Destek merkezinde (afiet.co/destek) iki şey daha sayarız: bir yazının altındaki ' +
          '"Bu yazı yardımcı oldu mu?" cevabın (yalnız evet ya da hayır) ve destek aramanda ' +
          'hiç sonuç çıkmayan sorgu metni. İkincisi hangi konuyu henüz yazmadığımızı ' +
          'görmek içindir; adınla ya da hesabınla ilişkilendirilmez. Lütfen arama kutusuna ' +
          'kişisel ya da sağlık bilgisi yazma.',
        'Analitik yalnız açık onayınla çalışır: ilk ziyaretinde çıkan bilgilendirmede "Reddet" ' +
          'diyebilir, tarayıcının "İzleme yok" (Do Not Track) ayarını açabilir ya da çerezleri ' +
          'silerek istatistiğe dahil olmayı durdurabilirsin. Bu, destek merkezindeki iki ' +
          'sayımı da kapsar.',
      ],
    },
    {
      title: 'afiet.co’da Afi’ye soru sorma',
      body: [
        'Sitedeki “Afi’ye sor” bölümüne yazdığın soru, cevabı üretebilmemiz için ' +
          'afiet’in kendi sunucusuna gönderilir. Adını, e-postanı ya da bir hesabı ' +
          'istemeyiz; sohbet için sunucunun ürettiği, sekmen açık kaldığı sürece ' +
          'yaşayan rastgele bir oturum numarası kullanılır ve bu numara cihazına ' +
          'kaydedilmez.',
        'Soruları ve Afi’nin cevaplarını, Afi’yi geliştirmek ve hangi konuları daha ' +
          'iyi anlatmamız gerektiğini görmek için saklarız. IP adresini saklamayız; ' +
          'kötüye kullanımı sınırlamak için yalnızca geri döndürülemez biçimde ' +
          'özetlenmiş (hash’lenmiş) hâlini kısa süre tutarız. Sorular reklam için ' +
          'kullanılmaz, üçüncü taraflarla paylaşılmaz.',
        'Kişisel sağlık bilgini yazmana gerek yok; lütfen yazma. Afi genel bilgi ' +
          'verir, tıbbi tavsiye ya da kişiye özel beslenme önerisi vermez.',
        'Cevabı üretmek için sorun Microsoft Azure’un Avrupa bölgesindeki yapay zekâ ' +
          'servisine iletilir. Orada model eğitimi için kullanılmaz.',
        'Bu bölümü otomatik kötüye kullanımdan korumak için Cloudflare Turnstile ' +
          'kullanırız. Turnstile sessiz çalışır, ekranda bir şey göstermez ve ancak ' +
          'çok sayıda arka arkaya soruda devreye girer; sayfayı okuyup geçen bir ' +
          'ziyaretçi için hiç çalışmaz. Bu kontrol sırasında Cloudflare, isteğin ' +
          'geldiği ağ bilgisini görür. Ayrıntılar Cloudflare’in Turnstile Gizlilik ' +
          'Ek Metni’nde: https://www.cloudflare.com/turnstile-privacy-policy/',
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
        'Hesabını ve tüm verilerini uygulamadan silebilirsin: menü → Hesap ayarlarım → ' +
          'Hesabı ve tüm verileri sil. ' +
          'Bu işlem öğün, ölçü ve profil kayıtlarını kalıcı olarak kaldırır.',
        'Uygulamaya erişemiyorsan adımlar için “Hesabını sil” sayfasına bakabilir ' +
          'ya da destek@afiet.co adresine yazarak silme talep edebilirsin; talebini ' +
          'en geç 30 gün içinde işleriz.',
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
      body: [
        'Sorular ve talepler için: destek@afiet.co',
        'Kişisel verilerine ilişkin resmi başvurularını kvkk@afiet.co adresine ' +
          'iletebilirsin.',
      ],
    },
  ],
}

export const hesapSil = {
  title: 'Hesabını sil',
  contact: 'destek@afiet.co',
  intro:
    'Hesabını ve afiet’teki tüm verilerini istediğin zaman silebilirsin. En hızlısı ' +
    'uygulama içinden; erişemiyorsan e-posta ile de talep edebilirsin.',
  appTitle: 'Uygulamadan (en hızlı)',
  steps: [
    'afiet uygulamasını aç ve giriş yap.',
    'Sağ üstteki menü simgesine dokun ve “Hesap ayarlarım”ı seç.',
    'Sayfanın altındaki “Hesabı ve tüm verileri sil”e dokun ve onayla.',
    'Öğün, ölçü ve profil kayıtların dâhil tüm verilerin kalıcı olarak silinir; ' +
      'işlem geri alınamaz.',
  ],
  emailTitle: 'E-posta ile',
  emailBody:
    'Uygulamaya erişemiyorsan, kayıtlı e-posta adresinden destek@afiet.co ' +
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

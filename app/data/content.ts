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

export const cta = {
  title: 'afiet yakında cebinde',
  sub:
    'App Store ve Google Play’e geliyor. E-postanı bırak, ' +
    'çıktığı gün ilk sen öğren.',
  formPlaceholder: 'e-posta adresin',
  formButton: 'Haber ver',
  formDone: 'Afiyet olsun, listedesin! 🎉 Çıktığı gün sana yazacağız.',
  formError: 'Bir şey ters gitti — birazdan yeniden dener misin?',
  formSoon: 'Bekleme listesi çok yakında burada 🌱',
}

export const footer = {
  tagline: 'Sayma, dengele.',
  signoff: 'Sofranıza afiyet.',
}

import type { Accent, SocialIcon } from './content'

/**
 * İngilizce sayfaların (/en/*) tüm metni - content.ts'in EN kardeşi.
 * Konumlama HİBRİT (kullanıcı kararı, 5 Ağu 2026): evrensel kavramla açılır
 * (no counting, hand measures), Türk sofrası kökeni ikinci planda güç
 * unsurudur. Tagline karşılığı: "Stop counting. Start balancing."
 *
 * Ton kuralları TR ile aynıdır (afiet-mobile/BRAND.md): "someone who loves
 * you at the table"; davet var, yargı yok, suçluluk yok. Uzun tire (em dash)
 * İngilizce metinde de kullanılmaz. "afiet" her yerde küçük harftir.
 *
 * CTA kuralı (kullanıcı kararı, 5 Ağu 2026): İngilizce sayfada beta formu
 * YOKTUR. Uygulama bugün Türkçe; EN ziyaretçiye dürüstçe "English is on the
 * way" denir ve e-postası bültenle alınır (lang='en' olarak işaretlenir).
 */

export const siteEn = {
  skipLink: 'Skip to content',
  langLabel: 'Türkçe',
  langShort: 'TR',
  headerAria: 'afiet home',
  navAria: 'Site navigation',
  menuAria: 'Menu',
  navWhy: 'Why afiet?',
  navContact: 'Contact',
  cta: 'Get updates',
}

export const heroEn = {
  eyebrow: 'Balanced eating, together',
  titleA: 'Stop counting.',
  titleB: 'Start balancing.',
  sub:
    'afiet does not make you count calories. It speaks the language of the ' +
    'table (how many slices, how many bowls, a handful) and turns balanced ' +
    'eating into a warm habit you share with the people you love.',
  ctaPrimary: 'Get updates',
  ctaSecondary: 'Why afiet?',
}

/** Hero'da telefonun etrafında süzülen ölçü çipleri (TR'dekilerin karşılığı). */
export const measureChipsEn: { label: string; accent: Accent }[] = [
  { label: '2 slices', accent: 'meyve' },
  { label: 'half a bowl', accent: 'tahil' },
  { label: 'a handful', accent: 'sebze' },
  { label: '1 cup', accent: 'sut' },
]

export const zagsIntroEn = {
  eyebrow: 'Why afiet?',
  title: 'Because the table does not count.',
}

/** key'ler TR ile aynı kalır: ZagIcon çizimini key seçer. */
export const zagsEn: { key: string; title: string; body: string; accent: Accent }[] = [
  {
    key: 'denge',
    title: 'Balance, not numbers',
    body:
      'No calorie targets, no red warnings, no guilt. You see five food ' +
      'groups as colors; as your day balances out, your table completes itself.',
    accent: 'sebze',
  },
  {
    key: 'sofra',
    title: 'The language of the table',
    body:
      'Not grams and calories: how many slices, how many bowls, a handful. ' +
      'More than 2,000 dishes and foods are ready inside.',
    accent: 'tahil',
  },
  {
    key: 'afi',
    title: 'Afi by your side',
    body:
      'Snap a photo of a dish you do not recognize and let Afi name it. ' +
      'Ask whatever is on your mind; Afi answers in the language of the table.',
    accent: 'protein',
  },
  {
    key: 'ritim',
    title: 'Your own rhythm',
    body:
      'Not a perfect week, your rhythm. You see your week as balanced days; ' +
      'every meal is a fresh start.',
    accent: 'meyve',
  },
  {
    key: 'aile',
    title: 'Together, as a family',
    body:
      'Everyone has their own profile, all of you share the same table. ' +
      'Habits are not built alone; they are built together and celebrated together.',
    accent: 'sut',
  },
  {
    key: 'sefkat',
    title: 'With kindness',
    body:
      'afiet never judges. On a missed day it says "tomorrow is a new table" ' +
      'and on a balanced day it celebrates with you.',
    accent: 'sebze',
  },
]

/**
 * Hibrit konumlamanın ikinci planı: köken hikayesi. Evrensel vaadin altında
 * durur, onu gölgelemez; dürüstlük satırı (uygulama bugün Türkçe) buradadır.
 */
export const originEn = {
  eyebrow: 'Where afiet comes from',
  title: 'Born at the Turkish table',
  body: [
    'afiet grew up around one of the most generous food cultures in the ' +
      'world, where meals are measured in slices, bowls and handfuls rather ' +
      'than grams, and where nobody eats alone.',
    'That is why afiet works the way a real table works: portions you can ' +
      'see in your hand, five food groups as colors, and the whole family ' +
      'around the same table.',
    'The app speaks Turkish today. English is on the way, and everything ' +
      'afiet believes in (no counting, no guilt, eating together) travels well.',
  ],
}

export const voiceEn = {
  eyebrow: 'Tone of voice',
  title: 'It talks like someone who loves you at the table',
  sub: 'Invitations instead of warnings, celebration instead of guilt. This is how afiet sounds:',
  messages: [
    'Good morning! Any room for greens today? 🌿',
    'Enjoy! 🎉 You logged your first meal.',
    'Your table missed you 🍲',
    'You were in balance today, all five groups 💚',
  ],
}

/**
 * Sayfa sonu çağrısı: beta formu değil, bülten. E-postalar lang='en' olarak
 * kaydedilir ki İngilizce duyuru yalnız bu listeye gitsin.
 */
export const updatesEn = {
  eyebrow: 'coming soon',
  title: 'afiet is in beta, in Turkish, today.',
  sub:
    'The English version is on the way. Leave your email and we will write ' +
    'to you when afiet speaks your language; nothing else, no spam.',
  note: 'One short email when English is ready, plus the occasional letter from our table.',
}

export const footerEn = {
  tagline: 'Stop counting. Start balancing.',
  signoff: 'Enjoy your table.',
  links: [
    { label: 'Why afiet?', to: '/en#why' },
    { label: 'Contact', to: '/en/contact' },
    { label: 'Privacy', to: '/en/privacy' },
    { label: 'Delete account', to: '/en/delete-account' },
  ] as { label: string; to: string }[],
}

export const bultenEn = {
  eyebrow: 'newsletter',
  title: 'A letter from our table',
  sub:
    'New releases and short notes from the table; once a week at most, ' +
    'always one click to leave.',
  placeholder: 'your email address',
  submit: 'Subscribe',
  sending: 'Sending…',
  success: 'Check your inbox: your confirmation link is on its way 💌',
  invalid: 'Could you enter a valid email? 🌿',
  error: 'Something went wrong. Could you try again in a bit?',
  kvkk: 'We only use your email to send the newsletter. Details:',
  privacyLabel: 'Privacy page',

  // Onay sayfası (/en/newsletter/confirm).
  confirmTitle: 'Welcome to the table 💚',
  confirmBody: 'Your subscription is confirmed. The first letter is on its way; until then, enjoy your table.',
  confirmFailTitle: 'That link did not work',
  confirmFailBody:
    'The confirmation link may have expired or already been used. ' +
    'You can subscribe again below if you like.',
  backHome: 'Back to home',

  // Çıkış sayfası (/en/newsletter/leave).
  leaveTitle: 'Safe travels 🌿',
  leaveBody:
    'You are unsubscribed and will not receive any more letters. If you ' +
    'change your mind, there is always a place for you at the table.',
}

export const cookieEn = {
  ariaLabel: 'Cookie notice',
  textA: 'To improve afiet.co we measure visits ',
  strong: 'anonymously and in aggregate',
  textB:
    ' (on our own server, first-party cookie; no IP stored, nothing shared ' +
    'with third parties).',
  details: 'Details',
  decline: 'Decline',
  accept: 'Accept',
}

export const storeBadgesEn = {
  soon: 'Coming soon',
}

/**
 * İletişim (/en/contact): kartpostal metaforunun İngilizce yüzü.
 * Şekli content.ts > iletisim ile BİREBİR aynıdır (KartpostalIletisim.vue
 * ikisini de okur); alan eklerken iki dosyayı birlikte değiştir.
 */
export const contactEn = {
  eyebrow: 'contact',
  title: 'Write us a postcard',
  sub:
    'A suggestion, a question, a problem or a partnership: whatever you ' +
    'write, a real person reads it and replies. During the beta the product ' +
    'team sees every message.',

  cardTo: 'Dear afiet,',
  stampLegend: 'Pick your stamp',
  topics: [
    { key: 'oneri', label: 'Suggestion', accent: 'sebze' },
    { key: 'soru', label: 'Question', accent: 'sut' },
    { key: 'sorun', label: 'Problem', accent: 'tahil' },
    { key: 'isbirligi', label: 'Partnership', accent: 'meyve' },
  ] as { key: string; label: string; accent: Accent }[],

  stampEmptyA: 'stamp',
  stampEmptyB: 'goes here',

  messageLabel: 'Your message',
  messagePlaceholder: 'Whatever is on your mind…',
  nameLabel: 'From',
  namePlaceholder: 'your name (if you like)',
  emailLabel: 'Email',
  emailPlaceholder: 'an address we can reply to',
  submit: 'Send it',
  sending: 'Sending…',

  successTitle: 'Your postcard is on its way 💌',
  successBody: 'Thank you! We will get back to you within two days. Enjoy your table.',
  successAgain: 'Write another postcard',

  missingMessage: 'A postcard should not travel empty: could you write a few words? 🌿',
  invalidEmail: 'Could you enter a valid email? 🌿',
  error: 'The post office did not answer. Could you try again in a bit?',

  kvkk:
    'When you send it, we use your name, email and message only to reply to ' +
    'you; we never share them with third parties. Details:',
  privacyLabel: 'Privacy page',

  socialTitle: 'You can also find us here',
  socialSub: 'The diary of our table and what happens behind it.',
  mailTitle: 'Prefer plain email?',
  mailBody: 'If a postcard is not your thing, the same door opens by email too:',
  mailAddress: 'destek@afiet.co',

  bultenTitle: 'A letter from our table',
  bultenSub: 'A postcard is one-off; the newsletter is regular. Happy to send both.',
}

/**
 * Gizlilik politikası (/en/privacy): content.ts > privacy metninin İngilizce
 * karşılığıdır ve onunla İÇERİK olarak senkron tutulur; TR politika
 * değişirse burası da değişir. Şekil aynıdır (PrivacyArticle.vue ikisini de
 * okur).
 */
export const privacyEn = {
  title: 'Privacy Policy',
  effectiveLabel: 'Effective',
  effective: 'July 31, 2026',
  contact: 'destek@afiet.co',
  intro:
    'afiet helps you build balanced eating habits with your family. We only ' +
    'collect the data the app needs to work; there are no ads, no tracking ' +
    'and no selling to third parties.',
  sections: [
    {
      title: 'Data we collect',
      body: [
        'Account: your email address, for authentication (provider: Stack Auth).',
        'Profile: your display name, sex, date of birth, height and activity level.',
        'Health and nutrition: your meal and food logs, food groups, water intake, ' +
          'body measurements (weight, waist, neck, hip) and values calculated from ' +
          'them such as BMI, BMR and TDEE.',
        'Usage: your logging dates and in-app activity such as streaks.',
        'Notifications: if you allow them, your device\'s anonymous push token so ' +
          'we can send reminders and announcements. You can turn notifications off ' +
          'in your device settings at any time.',
      ],
    },
    {
      title: 'Why we process data',
      body: [
        'Only to make the app work: storing your logs, managing family profiles ' +
          'and showing you balanced eating summaries.',
        'We do not show ads, we do not sell your data, we do not share it with ' +
          'third parties and we do not track you.',
      ],
    },
    {
      title: 'Sending Afi a photo in the app',
      body: [
        'You can ask Afi about a dish you do not recognize by sending a photo. ' +
          'The photo is forwarded, through afiet\'s own server, to Microsoft ' +
          'Azure\'s AI service in the European region solely so we can recognize ' +
          'the dish; it is not used for model training there.',
        'Your photos are never used for advertising and never shared with third parties.',
      ],
    },
    {
      title: 'Crash and error reports',
      body: [
        'If the app closes unexpectedly, a technical record (device model, ' +
          'operating system version, the screen where the error happened) is ' +
          'collected through Sentry so we can find and fix the problem.',
        'These records contain no meal or health data; they are not used for ' +
          'advertising or profiling.',
      ],
    },
    {
      title: 'Website analytics (afiet.co)',
      body: [
        'To understand visits to afiet.co we keep first-party, anonymous and ' +
          'aggregate statistics on our own server, without external tools ' +
          '(Google Analytics etc.): which pages were viewed, where visitors came ' +
          'from (search/social/link), approximate country, device and browser type.',
        'For this, a random cookie that contains no identity (afiet_vid / afiet_sid) ' +
          'is written to your browser; it exists only to estimate unique visitors. ' +
          'We do not store your IP address, share it with third parties, use it for ' +
          'advertising or track you across sites.',
        'In the help center (afiet.co/destek) we count two more things: your answer ' +
          'to "Was this article helpful?" (only yes or no) and search queries that ' +
          'returned no results. The second exists to show us which topics we have ' +
          'not written yet; neither is linked to your name or account. Please do not ' +
          'type personal or health information into the search box.',
        'Analytics runs only with your explicit consent: you can choose "Decline" in ' +
          'the notice shown on your first visit, turn on your browser\'s Do Not ' +
          'Track setting, or delete your cookies to stop being counted. This also ' +
          'covers the two help center counts.',
      ],
    },
    {
      title: 'Asking Afi a question on afiet.co',
      body: [
        'A question you type into the "Ask Afi" section of the site is sent to ' +
          'afiet\'s own server so the answer can be generated. We do not ask for ' +
          'your name, email or an account; the chat uses a random session id ' +
          'created by the server that lives only while your tab is open and is ' +
          'not stored on your device.',
        'We keep the questions and Afi\'s answers to improve Afi and to see which ' +
          'topics we should explain better. We do not store your IP address; to ' +
          'limit abuse we keep only an irreversibly hashed form of it for a short ' +
          'time. Questions are never used for advertising and never shared with ' +
          'third parties.',
        'There is no need to write personal health information; please do not. ' +
          'Afi gives general information, not medical advice or personalized ' +
          'nutrition plans.',
        'To generate the answer, your question is forwarded to Microsoft Azure\'s ' +
          'AI service in the European region. It is not used for model training there.',
        'To protect this section from automated abuse we use Cloudflare ' +
          'Turnstile. Turnstile runs silently, shows nothing on screen and only ' +
          'steps in after many rapid questions; it never runs for a visitor who ' +
          'just reads the page. During this check Cloudflare sees the network ' +
          'information of the request. Details are in Cloudflare\'s Turnstile ' +
          'Privacy Addendum: https://www.cloudflare.com/turnstile-privacy-policy/',
      ],
    },
    {
      title: 'Where it is stored',
      body: [
        'Your data is stored on servers we manage (Google Cloud, European ' +
          'region); transfer between your device and the server is encrypted ' +
          'with HTTPS.',
        'Authentication is provided by Stack Auth.',
      ],
    },
    {
      title: 'Deleting your data',
      body: [
        'You can delete your account and all your data from the app: menu → My ' +
          'account settings → Delete account and all data. This permanently ' +
          'removes your meal, measurement and profile records.',
        'If you cannot access the app, see the "Delete your account" page for ' +
          'the steps or write to destek@afiet.co to request deletion; we process ' +
          'requests within 30 days at the latest.',
      ],
    },
    {
      title: 'Children',
      body: [
        'afiet is for users aged 18 and over. We do not knowingly collect data ' +
          'from anyone under 18.',
      ],
    },
    {
      title: 'Changes',
      body: [
        'We may update this policy from time to time; important changes are ' +
          'announced on this page. The effective date is written above.',
      ],
    },
    {
      title: 'Contact',
      body: [
        'For questions and requests: destek@afiet.co',
        'You can send formal requests about your personal data to kvkk@afiet.co.',
      ],
    },
  ],
  deleteCta: 'Delete your account →',
  deleteTo: '/en/delete-account',
}

/** Hesap silme (/en/delete-account): content.ts > hesapSil'in karşılığı. */
export const deleteAccountEn = {
  title: 'Delete your account',
  contact: 'destek@afiet.co',
  intro:
    'You can delete your account and all your afiet data at any time. The ' +
    'fastest way is inside the app; if you cannot access it, email works too.',
  appTitle: 'From the app (fastest)',
  steps: [
    'Open the afiet app and sign in.',
    'Tap the menu icon in the top right and choose "My account settings".',
    'Tap "Delete account and all data" at the bottom of the page and confirm.',
    'All your data, including meal, measurement and profile records, is ' +
      'permanently deleted; this cannot be undone.',
  ],
  emailTitle: 'By email',
  emailBody:
    'If you cannot access the app, write "delete my account" to ' +
    'destek@afiet.co from your registered email address. After verifying your ' +
    'identity we delete your account and all your data within 30 days at the latest.',
  emailCta: 'Send an email',
}

export type { Accent, SocialIcon }

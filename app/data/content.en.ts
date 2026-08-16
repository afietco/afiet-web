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
  navTools: 'Calculators',
  navBlog: 'Blog',
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
    { label: 'Calculators', to: '/en/tools' },
    { label: 'About', to: '/en/about' },
    { label: 'Press', to: '/en/press' },
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

  // Blog yazı sonu varyantı (TR'deki bulten.blogTitle/blogSub karşılığı).
  blogTitle: 'Get the next one in your inbox',
  blogSub: 'A short note when a new post goes up or a new release lands.',

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

/**
 * Blog (/en/blog). TR karşılığı content.ts > blog.
 *
 * İngilizce yazılar Türkçe yazıların ÇEVİRİSİ DEĞİLDİR: İngilizce arama ve
 * istem diline göre ayrıca kurgulanır. Bir yazı gerçekten çevrildiğinde
 * veritabanındaki `translation_of` alanı doldurulur ve iki yazı birbirine
 * hreflang verir; eşlemesi olmayan yazı tek başına yaşar.
 */
export const blogEn = {
  eyebrow: 'the afiet journal',
  title: 'Notes from the table',
  sub:
    'Short guides on balanced eating without calorie counting, hand-measure ' +
    'portions and the family table.',
  rss: 'Follow with RSS',
  empty: 'The first post is in the oven. 🌿',
  back: '← All posts',
  readingSuffix: 'min read',
  searchLabel: 'Search posts',
  searchPlaceholder: 'Search a topic: portions, breakfast, balance...',
  sortLabel: 'Sort',
  sortNew: 'Newest',
  sortOld: 'Oldest',
  noResults: 'No post matched that search. Try another word?',
  pagesLabel: 'Blog pages',
  pagePrev: 'Previous page',
  pageNext: 'Next page',
  navLabel: 'Blog',
  updatedPrefix: 'Updated',
  // Yazar künyesi; ad ve unvan shared/utils/author.ts'ten gelir.
  authorPrefix: 'Written by',
  authorCardTitle: 'Who wrote this?',
  authorCardCta: 'The author and our editorial rules',
  // Yazı sonu: TR'de beta çağrısı var, İngilizce'de beta YOK (uygulama
  // Türkçe), o yüzden okur bültene davet edilir.
  endLead: 'afiet is in beta, in Turkish today:',
  endCta: 'get updates when English is ready',
  endTo: '/en#updates',
}

/**
 * /en ana sayfadaki taze yazılar şeridi. TR karşılığı content.ts > homeBlog.
 *
 * Eyebrow ve okuma soneki BİLEREK blogEn ile aynı sözcükleri kullanır: şerit
 * ile /en/blog aynı yerin iki görüntüsüdür, ikisinde ayrı isim okumak
 * ziyaretçiye iki ayrı bölüm varmış gibi gelir.
 */
export const homeBlogEn = {
  eyebrow: 'the afiet journal',
  title: 'Fresh from the table',
  sub:
    'Balanced eating in the language of the table: no judgement, no calorie ' +
    'counting, small enough to try at dinner tonight.',
  cta: 'See all posts',
  readingSuffix: 'min read',
}

export const cookieEn = {
  ariaLabel: 'Cookie notice',
  textA: 'To improve afiet.co we measure visits ',
  strong: 'anonymously and in aggregate',
  textB:
    ' (on our own server, first-party cookie; no IP stored, no profiling; if you ' +
    'came from an ad, only the fact that the click worked is reported back).',
  details: 'Details',
  decline: 'Decline',
  accept: 'Accept',
}

export const storeBadgesEn = {
  soon: 'Coming soon',
}

/**
 * Hata sayfası (app/error.vue). /en altında bir yol tutmadığında Türkçe
 * "Bu sofrada öyle bir sayfa yok" ekranı çıkıyordu; İngilizce ziyaretçi için
 * dilin ortasında kopması yanlış. Ton TR ile aynı: suçlama yok, davet var.
 */
export const errorEn = {
  notFoundTitle: 'Page not found | afiet',
  errorTitle: 'Something went wrong | afiet',
  titleNotFound: 'There is no such page at this table',
  titleError: 'Something went wrong',
  bodyNotFound: 'The page you are looking for may have moved or never existed. Shall we head back to the table?',
  bodyError: 'Sorry about that, something slipped. You can continue from the home page.',
  cta: 'Back to home',
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
 * Yazar sayfası (/en/about). TR karşılığı content.ts > hakkinda; şekil aynıdır
 * (HakkindaSayfasi.vue ikisini de okur) ve İÇERİK olarak senkron tutulur.
 *
 * /en 6 Ağu 2026'da park edilmişti; bu sayfa bilinçli istisnadır (kullanıcı
 * kararı, 11 Ağu 2026): /en/blog canlı olduğu için İngilizce yazının yazar
 * künyesi de İngilizce bir sayfaya bağlanmalı.
 */
export const aboutEn = {
  eyebrow: 'about',
  title: 'Who writes these guides?',
  sub:
    'There is a person behind every text you read about food. Here is who I ' +
    'am, what I base these guides on, and what we deliberately never do.',

  bioTitle: 'Hello',
  bio: [
    'My name is Berk Karataş. I founded afiet, and I write the app, this site ' +
      'and these guides.',
    'I am not a dietitian; I am a developer. afiet started with a question at ' +
      'my own table: why does a day spent counting every bite end in tiredness ' +
      'rather than confidence? The number said something, but it never ' +
      'described the table. That is why afiet speaks in measures instead of ' +
      'calories: slices, bowls, handfuls.',
    'The guides keep the same line. Nothing here is a personal plan; it is ' +
      'general information that always says where it came from.',
  ],

  principlesTitle: 'How these guides are written',
  principles: [
    {
      title: 'Sources stay visible',
      body:
        'Nutrition claims follow public health sources. When we give a number ' +
        'or a recommendation, we link where it came from inside the post. No ' +
        'unsourced figures.',
      accent: 'sebze',
    },
    {
      title: 'Not medical advice',
      body:
        'These are general guides. If you have a condition, an allergy, a ' +
        'pregnancy or a prescribed plan, talk to your doctor and dietitian; ' +
        'nothing here replaces that conversation.',
      accent: 'sut',
    },
    {
      title: 'No target weight, no timelines',
      body:
        'You will never read “lose this much in this many weeks” here. No ' +
        'ideal weight, no deadlines, no guilt. We measure consistency, not ' +
        'perfection.',
      accent: 'tahil',
    },
    {
      title: 'Afi helps, a person is accountable',
      body:
        'Afi lends a hand while we draft; it knows the language of the table. ' +
        'But every post is read end to end and approved by me before it goes ' +
        'live, and I check each source myself. A person is accountable for ' +
        'every published line.',
      accent: 'meyve',
    },
    {
      title: 'What ages gets fixed',
      body:
        'Every post carries its last updated date. Correcting a wrong or ' +
        'outdated line comes before writing a new post.',
      accent: 'protein',
    },
  ] as { title: string; body: string; accent: Accent }[],

  sourcesTitle: 'Sources we keep coming back to',
  sourcesSub: 'Posts link beyond this list, but most of it starts here.',
  sources: [
    {
      label: 'World Health Organization, Healthy diet',
      href: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
    },
    {
      label: 'Harvard T.H. Chan, The Healthy Eating Plate',
      href: 'https://nutritionsource.hsph.harvard.edu/healthy-eating-plate/',
    },
    {
      label: 'NHS, The Eatwell Guide',
      href: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/the-eatwell-guide/',
    },
    {
      label: 'British Dietetic Association, Portion sizes',
      href: 'https://www.bda.uk.com/resource/food-facts-portion-sizes.html',
    },
    {
      label: 'Ministry of Health of Türkiye, national dietary guidelines (TÜBER)',
      href: 'https://hsgm.saglik.gov.tr/tr/web-uygulamalarimiz/357.html',
    },
  ],

  contactTitle: 'If you want to ask or correct something',
  contactBody:
    'Spotted a mistake, found something missing, or just want to say hello? ' +
    'Write to us: every message is actually read.',
  contactCta: 'Send us a postcard',
  contactTo: '/en/contact',
  mailAddress: 'destek@afiet.co',
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
  effective: 'August 15, 2026',
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
        'Usage: your logging dates and in-app activity such as your afiyet rhythm, ' +
          'plus usage events such as which screens you opened, how long you stayed ' +
          'and how long the app took to launch. We keep these to fix the product, ' +
          'not for advertising or profiling: they answer the question "is this where ' +
          'people get stuck". What you ate or wrote never goes into an event.',
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
      title: 'Assistant conversations',
      body: [
        'What you write to Afi, to the nutrition assistant and to the support ' +
          'assistant is stored on our server together with your account, so that a ' +
          'conversation carries across devices and the assistants come to know you ' +
          'over time.',
        'What we store is what you wrote and what the assistant wrote. We do not ' +
          'derive summaries, scores or labels from your conversations.',
        'To produce a reply, your message is forwarded to Microsoft Azure\'s AI ' +
          'service in the European region; it is not used for model training there.',
        'Conversations are never used to train AI models, never used for ' +
          'advertising and never shared with third parties.',
        'What is discussed in the support conversation may relate to mental health, ' +
          'which data protection law treats as a special category. The support ' +
          'conversation is therefore stored only with your explicit consent; you can ' +
          'withdraw that consent at any time and delete your conversations.',
        'Deleting a conversation removes it from your device and from the server. ' +
          'Deleting your account deletes your conversations too. Conversations you ' +
          'do not delete are kept for at most 24 months.',
      ],
    },
    {
      title: 'The note we keep about you',
      body: [
        'Starting from your logs, afiet keeps a short note about you: what you came ' +
          'for, how you eat, where your rhythm holds and where it slips, the trend ' +
          'in your body, who you eat with and topics left open. This note is ' +
          'written by AI.',
        'The note holds no numbers; your meal list, your measurements and your ' +
          'weight stay in their own tables. What is kept is the interpretation, ' +
          'such as "steady on weekdays, slips at the weekend". Your conversations ' +
          'do NOT go into this note.',
        'It exists so the assistants do not have to get to know you from scratch ' +
          'every time; Afi and the specialist assistants read it while talking to you.',
        'Our team can also read the note and write one of its sections by hand, so ' +
          'that whoever answers a support request understands your situation. Every ' +
          'version is kept, so a wrong interpretation can be rolled back.',
        'Deleting your account deletes this note too.',
      ],
    },
    {
      title: 'Subscription and payment',
      body: [
        'You buy the afiet+ subscription through the App Store or Google Play. ' +
          'Payment goes through your store account; your card details, billing ' +
          'address and payment information never reach us and are never stored by us.',
        'We use a service called RevenueCat to track the state of your ' +
          'subscription. What goes to it is the store purchase record and your afiet ' +
          'account id; your name, your email and your nutrition data do not.',
        'We also keep the state of your subscription (which product, which store, ' +
          'valid until when) on our own server, because that is what decides which ' +
          'features the app unlocks.',
      ],
    },
    {
      title: 'Groups and the shared table',
      body: [
        'When you join a group, the other members see your name, your emoji, your ' +
          'level, whether you logged your table that day and how balanced the day ' +
          'was. You can say "afiyet olsun" to each other and those greetings are visible.',
        'What you ate, your measurements and your weight do NOT go to the group. ' +
          'Nobody can see your meal list or your body records.',
        'If you would rather not appear at the shared table, you can turn it off in ' +
          'the group settings; you stay in the group but your rhythm and balance are ' +
          'not shown to the others.',
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
          'ad targeting or profiling, or track you across sites.',
        'Ad measurement: if you arrived at afiet.co from an ad, the link carries the ' +
          'ad network\'s click identifier (gclid for Google). To see which ad worked ' +
          'we store that identifier, whether you clicked a store link or signed up ' +
          'for the newsletter, and when; we then upload only "this click converted ' +
          'to a store link at this time" to the ad network, by hand. Your email ' +
          'address, IP address or the pages you visited are not sent, and no ad ' +
          'network code or cookie runs on the site. The link to the Play store ' +
          'carries the same identifier and the page you came from so the app knows ' +
          'which channel it was installed from. This goes through the same consent ' +
          'gate: if you choose "Decline", the identifier is neither stored nor added ' +
          'to the link.',
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
        'afiet is for users aged 13 and over. We do not knowingly collect data ' +
          'from anyone under 13; if we notice such an account we close it and ' +
          'delete its data.',
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

/**
 * Hesaplama araçları (/en/tools). TR karşılığı content.ts > hesapla.
 *
 * MARKA DOKTRİNİ İngilizce'de de bağlayıcıdır (afiet-hedefler docs/hedeflerim.md
 * § 9 ve § 12): ideal kilo yok, hedef kilo yok, süre vaadi yok, hüküm kuran
 * sıfat yok, ondalıklı el ölçüsü yok. Sayı ikinci plandadır, katlanmış durur.
 *
 * CTA farkı: TR araçları /beta'ya çağırır, İngilizce araçlar /en#updates'e
 * (EN'de beta formu yok, uygulama bugün Türkçe).
 *
 * Porsiyon çevirici İngilizce'de YOK: katalog 2007 Türkçe besin adı taşıyor,
 * yarım çevrilmiş bir liste yayınlamıyoruz (kullanıcı kararı, 5 Ağu 2026).
 */
export const toolsEn = {
  eyebrow: 'calculators',
  title: 'We know the number too. We hand you your plate.',
  sub:
    'Most calculators give you a calorie figure and an "ideal weight", then go ' +
    'quiet. afiet runs the same math, then translates it into the language of ' +
    'the table: how many palms, how many fists.',
  toolsTitle: 'Tools',
  soonLabel: 'Coming soon',
  soonBody:
    'Next up: an English portion guide for the 2,000+ dishes inside the app, ' +
    'and measuring these tools with real use so we can drop whatever does not help.',

  breadcrumbRoot: 'Tools',
  unitsLabel: 'Units',
  unitOptions: [
    { key: 'imperial', label: 'ft, lb' },
    { key: 'metric', label: 'cm, kg' },
  ],

  /** Hub kartları. `to` gerçek bir sayfaya işaret etmek zorunda. */
  tools: [
    {
      to: '/en/tools/daily-portions-calculator',
      title: 'Daily portions',
      body: 'Your daily plate in hand measures: how many palms, fists, cupped hands and thumbs.',
      chips: ['3-4 palms', '4-5 fists', '5-6 cupped hands'],
      accent: 'sebze',
    },
    {
      to: '/en/tools/bmi-calculator',
      title: 'Body mass index',
      body: 'Index from your height and weight, in judgment-free range language. No ideal weight.',
      chips: ['height', 'weight'],
      accent: 'tahil',
    },
    {
      to: '/en/tools/daily-water-calculator',
      title: 'Daily water',
      body: 'How much water your body needs a day, in glasses. The same math the app uses.',
      // Birim seçicisi iki sistemi de veriyor; çip listesi ikisini de anmalı.
      chips: ['glasses', 'fl oz', 'liters'],
      accent: 'sut',
    },
    {
      to: '/en/tools/body-fat-calculator',
      title: 'Body fat',
      body: 'Body fat percentage and fat free mass from your waist, neck and hip measurements.',
      chips: ['waist', 'neck', 'hip'],
      accent: 'protein',
    },
  ] as { to: string; title: string; body: string; chips: string[]; accent: Accent }[],

  /** Tüm araçların altında duran iki cümle. */
  disclaimer:
    'This is an estimate, not medical advice. If you have a condition, an ' +
    'allergy or a specific nutrition plan, talk to your doctor and dietitian.',
  privacy: 'What you type never leaves your browser; it is not sent to us and not stored.',
  errorMissing: 'Could you fill in the fields? 🌿',
  errorRange: 'Could you double-check these values? 🌿',

  // ── Motor Türkçe etiket döndürür; anahtar → İngilizce karşılık ──────────
  // Anahtarlar (#shared/hesap) sabittir, etiketler burada yaşar. Motor
  // @afiet/core aynasıdır ve DEĞİŞTİRİLMEZ; çeviri katmanı budur.

  /** `BMI_RANGES[].key` → etiket. Hüküm kuran kelime yok ("obese" vb. YASAK). */
  bmiRangeLabels: {
    ince: 'Lighter range',
    denge: 'Balance range',
    denge_ustu: 'Above balance',
    yuksek: 'Higher range',
  } as Record<string, string>,

  /** `SEXES[].key` → etiket. */
  sexLabels: { kadin: 'Female', erkek: 'Male' } as Record<string, string>,

  /** `ACTIVITY_LEVELS[].key` → etiket + açıklama. */
  activityLabels: {
    hareketsiz: { label: 'Desk-based', description: 'Most of my day is spent sitting' },
    az: { label: 'Lightly active', description: 'I move around here and there' },
    orta: { label: 'Active', description: 'I am on my feet for a good part of the day' },
    aktif: { label: 'Very active', description: 'I am moving often throughout the day' },
    cok_aktif: {
      label: 'Physically demanding',
      description: 'My work or daily routine is physically intense',
    },
  } as Record<string, { label: string; description: string }>,

  /**
   * `HandMeasure.key` → terim + grup adı. Terimler İngilizce el ölçüsü
   * sözlüğünün yerleşik karşılıklarıdır (palm / fist / cupped hand / thumb);
   * motorun Türkçe `text` alanı İngilizce sayfada KULLANILMAZ, sayı
   * `count`tan okunur ve terim buradan gelir.
   */
  handTerms: {
    protein: { term: 'palm', termPlural: 'palms', group: 'protein' },
    vegetable: { term: 'fist', termPlural: 'fists', group: 'vegetables' },
    grain: { term: 'cupped hand', termPlural: 'cupped hands', group: 'grains' },
    fat: { term: 'thumb', termPlural: 'thumbs', group: 'fats' },
  } as Record<string, { term: string; termPlural: string; group: string }>,

  /** `MINOR_NOTE` karşılığı (motor Türkçe döndürür, ekrana bu basılır). */
  minorNote:
    'Under 18 these formulas are only approximate; for children and teens, ' +
    'assessment is done with age percentiles.',

  /** Vücut kitle indeksi. */
  bmi: {
    slug: 'bmi-calculator',
    eyebrow: 'body mass index',
    title: 'What is your body mass index?',
    sub:
      'A rough signal calculated from your height and weight. It is not a ' +
      'verdict about you, and we do not hand out an ideal weight.',
    submit: 'Show my index',
    recalc: 'Calculate again',
    resultLabel: 'your body mass index',
    rangeLabel: 'This value sits in',
    context:
      'Body mass index cannot tell muscle from fat. A muscular person can land ' +
      '"above balance" and someone with low muscle mass can land in the balance ' +
      'range. That is why afiet never turns this number into a target; it only ' +
      'shows you where you stand today.',
    nextTitle: 'So what should your plate look like?',
    nextBody: 'An index is a snapshot. How to build the day is what your daily portions tell you.',
    nextCta: 'See my daily portions',
    nextTo: '/en/tools/daily-portions-calculator',
  },

  /** Günlük su. */
  water: {
    slug: 'daily-water-calculator',
    eyebrow: 'daily water',
    title: 'How much water should you drink a day?',
    sub:
      'Water needs follow the energy you burn rather than your weight alone. ' +
      'That is why we ask for a few more details.',
    submit: 'Show my water need',
    recalc: 'Calculate again',
    glassLabel: 'of water',
    literLabel: 'about',
    context:
      'We count a glass as 200 ml (about 6.8 fl oz). You need more in hot ' +
      'weather, when you exercise and when you are ill; tea and coffee count as ' +
      'fluid too, but they do not replace water.',
    nextTitle: 'Keeping track of water',
    nextBody: 'afiet counts your daily water with a single tap, reminds you and never pushes.',
    nextCta: 'Get updates',
    nextTo: '/en#updates',
  },

  /** Yağ oranı. */
  fat: {
    slug: 'body-fat-calculator',
    eyebrow: 'body fat',
    title: 'What is your body fat percentage?',
    sub:
      'Calculated from your waist, neck and hip measurements (the US Navy ' +
      'method). A tape measure is enough, no scale needed.',
    submit: 'Show my percentage',
    recalc: 'Calculate again',
    ratioLabel: 'your body fat',
    ffmLabel: 'your fat free mass',
    waistLabel: 'Waist',
    neckLabel: 'Neck',
    hipLabel: 'Hip',
    howTitle: 'How to take the measurements',
    howSteps: [
      'Bring the tape close enough to touch the skin, but do not pull it tight.',
      'Waist: measure at the level of your navel, without holding your breath.',
      'Neck: measure just below the larynx, letting the tape slope slightly down.',
      'Hip: measure at the widest point.',
    ],
    context:
      'This method is an estimate and carries a margin of a few points. Measured ' +
      'under the same conditions it shows the direction correctly; do not read a ' +
      'single measurement as a verdict.',
    implausible:
      'These measurements did not produce a plausible percentage. Could you ' +
      'check the tape and the numbers you entered?',
    nextTitle: 'Following your measurements',
    nextBody:
      'afiet keeps your measurements and shows their direction over time; it ' +
      'never builds a verdict on a single number.',
    nextCta: 'Get updates',
    nextTo: '/en#updates',
  },

  /** Sofra payın. */
  plate: {
    slug: 'daily-portions-calculator',
    eyebrow: 'daily portions',
    title: 'What should your day look like?',
    sub:
      'Give us a few details and we will describe your daily plate in hand ' +
      'measures. We do not ask for a goal weight and we promise no timelines.',

    formTitle: 'Tell us about you',
    sexLabel: 'Sex',
    ageLabel: 'Age',
    heightLabel: 'Height',
    weightLabel: 'Weight',
    activityLabel: 'How much do you move during the day?',
    submit: 'Show my plate',
    recalc: 'Calculate again',

    resultTitle: 'Here is how your day looks',
    handNote:
      'The measure is your own hand. That means it already scales to your body ' +
      'and there is no extra correction to make.',
    waterLabel: 'water',
    glassWord: 'glasses',
    numbersToggle: 'Show the numbers',
    numbersNote:
      'These are ranges, not targets. afiet will not make you count them during ' +
      'the day; they sit here because being curious is the most natural thing.',
    kcalLabel: 'Daily energy',
    basalLabel: 'Basal (at rest)',
    proteinLabel: 'Protein',
    carbLabel: 'Carbohydrate',
    fatLabel: 'Fat',
    fiberLabel: 'Fiber',

    minorTitle: 'We will not give you a target',
    minorBody:
      'At this age nutrition is assessed with age percentiles rather than a ' +
      'formula. The language of balance still holds for you: try to make room ' +
      'for all five food groups each day, and the rest settles with time.',

    ctaTitle: 'Living this every day',
    ctaBody:
      'A one-off calculation does not build a habit. afiet reminds you of this ' +
      'plate in the morning, shows you in the evening whether it came together, ' +
      'and never judges you.',
    ctaButton: 'Get updates',
    ctaTo: '/en#updates',
  },
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

/**
 * Press kit (/en/press). Türkçesinin AYNI gövdesini basar (BasinKiti.vue);
 * burada yalnız kopya çevrilir. Anahtarlar `content.ts > basin` ile birebir
 * aynıdır, biri eklenirse öteki de eklenir.
 *
 * İngilizce sayfa BİLİNÇLİ olarak yaşıyor (kullanıcı kararı, 11 Ağu 2026):
 * /en genel olarak park edilmiş olsa da yabancı basına verilecek adres budur
 * ve gazeteciye Türkçe sayfa gönderilmez.
 */
export const pressEn = {
  eyebrow: 'press',
  title: 'afiet press kit',
  sub:
    'Everything you need for an article, a review or a roundup is on this ' +
    'page. All of it is free to use in coverage; you do not need to ask first.',

  tanimTitle: 'One-sentence description',
  tanimNote: 'This is the official sentence describing afiet. Use it as it is.',
  kopyala: 'Copy',
  kopyalandi: 'Copied',

  kunyeTitle: 'Fact sheet',
  kunyeLabels: {
    ad: 'Name',
    tagline: 'Tagline',
    kategori: 'Category',
    platformlar: 'Platforms',
    lansman: 'Launch',
    ulke: 'Based in',
    dil: 'App language',
    site: 'Web',
    eposta: 'Contact',
  },
  kategori: 'Nutrition and health app',
  adNot: 'The name is always lowercase: afiet. It stays lowercase even at the start of a sentence.',

  uzunTitle: 'Long description',
  uzunNote: 'For the "about afiet" paragraph at the end of an article.',
  uzun: [
    'The app asks for portions in the measures people actually use at the ' +
      'table: how many slices, how many bowls, one handful. More than two ' +
      'thousand Turkish dishes and foods ship with it. The day is shown as the ' +
      'balance of five food groups in colors; it never asks for a target weight ' +
      'and never promises a timeline. You can also start a group with the people ' +
      'you eat with and follow the balance together.',
    'afiet is built in Türkiye and launches on iOS and Android in August 2026. ' +
      'It is not a medical device and does not give medical advice.',
  ],

  yanlisTitle: 'Three things to get right',
  yanlis: [
    {
      title: 'Not a calorie counter',
      body:
        'afiet does not frame the day around a calorie target. Energy and macro ' +
        'figures sit in the app as information; the measure of the day is the ' +
        'balance of the five groups.',
      accent: 'sebze',
    },
    {
      title: 'Not a diet app',
      body:
        'No banned lists, no restriction plans, no "lose this much in that many ' +
        'weeks". The metric is consistency, not perfection.',
      accent: 'meyve',
    },
    {
      title: 'The name is never capitalised',
      body:
        'Not "Afiet" and not "AFIET", always "afiet". It stays lowercase at the ' +
        'start of a sentence, and in the logo too.',
      accent: 'tahil',
    },
  ] as { title: string; body: string; accent: Accent }[],

  varlikTitle: 'Downloads',
  varlikSub:
    'Everything in one archive, or file by file. You may crop and resize the ' +
    'images; just do not alter what is in them.',
  zipLabel: 'Download the press kit',
  zipNote: 'Logo pack (SVG + PNG) and six screenshots in a single archive.',

  logoTitle: 'Logo',
  logoSub: 'Use the primary lockup on light backgrounds and the white one on dark.',
  logoIndir: 'SVG',

  ekranTitle: 'Screenshots',
  ekranSub: 'Click an image to open it at full resolution (1284 × 2778).',

  varlikAdlari: {
    kilit: 'Horizontal lockup',
    kelime: 'Wordmark',
    afi: 'Afi (icon)',
    beyaz: 'White lockup for dark backgrounds',
    bugun: 'Today screen',
    kayit: 'Quick meal entry',
    denge: 'Balance of the day',
    grubum: 'My group',
    vucudum: 'My body',
    rehber: 'Food guide',
  } as Record<string, string>,

  kurallarTitle: 'Brand usage',
  kurallarYapTitle: 'Do',
  kurallarYap: [
    'Use the logo exactly as it comes in the pack.',
    'Leave clear space of at least the height of Afi around it.',
    'Switch to the white version on dark backgrounds.',
  ],
  kurallarYapmaTitle: 'Do not',
  kurallarYapma: [
    'Recolour it, or add shadows and outlines.',
    'Stretch, skew or rotate it.',
    'Add text over a screenshot and present it as an official image.',
  ],

  kurucuTitle: 'Founder',
  kurucuNot: 'For interviews, a demo or extra images, write directly.',

  iletisimTitle: 'If you need anything else',
  iletisimBody:
    'Ask if you need an image, a screen recording or a figure that is not ' +
    'listed here. Press messages get an answer the same day.',
  mailAddress: 'destek@afiet.co',
}

export type { Accent, SocialIcon }

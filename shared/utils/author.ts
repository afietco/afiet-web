import type { SiteLocale } from './locales'

/**
 * Yazar kimliği - TEK KAYNAK. Üç tüketicisi var ve üçü de yalnız buradan okur:
 *   1. Person JSON-LD (server/utils/seoStore.ts: blog `BlogPosting.author`,
 *      destek `TechArticle.author` ve /hakkinda sayfasının ProfilePage'i)
 *   2. Sayfadaki görünür yazar bloğu (YazarSatiri.vue, YazarKarti.vue)
 *   3. /hakkinda + /en/about sayfalarının künyesi
 *
 * NEDEN: beslenme YMYL'dir ("your money or your life"); hem klasik aramanın
 * hem üretken motorların aradığı şey "bunu kim yazdı" sorusunun HEM sayfada
 * görünür HEM makine okunur bir cevabı olmasıdır. İkisi ayrı kaynaktan
 * beslenirse biri eskir ve şema sayfanın söylemediği bir şeyi iddia eder.
 *
 * `sameAs` YAZARIN KENDİ doğrulanabilir profilleridir; kurumun profilleri
 * ayrıdır (seoDefaults.ts > schema.organization.sameAs). Var olmayan profile
 * adres YAZILMAZ: liste boşken Person şemasına sameAs hiç basılmaz.
 */
export const AUTHOR = {
  name: 'Berk Karataş',
  /** Yazar sayfasının dile göre yolu; Person.url ve künyedeki bağlantı budur. */
  path: { tr: '/hakkinda', en: '/en/about' } as Record<SiteLocale, string>,
  jobTitle: { tr: 'afiet kurucusu', en: 'founder of afiet' } as Record<SiteLocale, string>,
  /**
   * Yazı sonundaki kartın 1-2 cümlesi. Uzun anlatım /hakkinda sayfasındadır
   * (app/data/content.ts > hakkinda); burası onun özetidir, kopyası değil.
   */
  bio: {
    tr:
      'afiet’i kuran ve buradaki yazıları yazan kişi. Diyetisyen değil; kendi ' +
      'sofrasında kalori saymaktan yorulup dengeyi ölçü diliyle yeniden kuran bir ' +
      'yazılımcı. Yazılardaki beslenme bilgisi halka açık resmî kaynaklara dayanır ' +
      've kişiye özel tavsiye değildir.',
    en:
      'Founder of afiet and the person who writes these guides. Not a dietitian: a ' +
      'developer who got tired of counting calories at their own table and rebuilt ' +
      'balance around the measures people actually use. The nutrition here follows ' +
      'public health sources and is not personal advice.',
  } as Record<SiteLocale, string>,
  sameAs: [] as string[],
}

export type AuthorProfile = {
  name: string
  path: string
  jobTitle: string
  bio: string
}

/** Yazarın o dildeki hâli; bileşenler ve şema aynı nesneyi okur. */
export function authorProfile(lang: SiteLocale): AuthorProfile {
  return {
    name: AUTHOR.name,
    path: AUTHOR.path[lang],
    jobTitle: AUTHOR.jobTitle[lang],
    bio: AUTHOR.bio[lang],
  }
}

/**
 * Person JSON-LD düğümü. `@id` her sayfada AYNI olmalı: blog yazısındaki
 * yazar ile /hakkinda sayfasındaki kişi motorların gözünde tek varlık olsun
 * diye şema düğümü kimliğini yazar sayfasından alır.
 */
export function personSchema(baseUrl: string, lang: SiteLocale): Record<string, unknown> {
  const base = baseUrl.replace(/\/$/, '')
  const url = base + AUTHOR.path[lang]
  return {
    '@type': 'Person',
    '@id': `${base}${AUTHOR.path.tr}#yazar`,
    name: AUTHOR.name,
    url,
    jobTitle: AUTHOR.jobTitle[lang],
    description: AUTHOR.bio[lang],
    ...(AUTHOR.sameAs.length ? { sameAs: AUTHOR.sameAs } : {}),
  }
}

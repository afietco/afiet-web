import type { SiteLocale } from './locales'

/**
 * Tek cümlelik marka tanımı - TEK KAYNAK (kullanıcı kararı, 11 Ağu 2026).
 *
 * NEDEN: bu cümle bugüne kadar yedi ayrı yerde yedi ayrı biçimde yazılıydı
 * (site meta'sı, SoftwareApplication şeması, /hakkinda gövdesi, iki mağaza
 * metni, Wikidata taslağı, sosyal biyografiler). Basın, mağaza ve üretken
 * arama motorları aynı varlığı tarif eden metinleri yan yana görüyor;
 * birbirini tutmayan tanımlar hem alıntılanabilirliği hem "bu neyin nesi"
 * sorusunun cevabını zayıflatıyordu. Artık cümlenin kendisi burada yaşar,
 * kullanan yer onu kopyalamaz, İÇERİ AKTARIR.
 *
 * KURAL: bu cümle değişirse tek satır burada değişir; aşağıdaki "kısa biçim"
 * istisnaları dışında hiçbir yerde elle yeniden yazılmaz.
 *
 * BİLİNÇLİ İSTİSNALAR (karakter sınırı cümleyi almıyor, kısaltılmış biçim
 * marka rehberinde ayrıca sabittir - afiet-mobile/BRAND.md > Tek cümlelik tanım):
 *   - App Store Subtitle (30):  "Kalori sayma, sofranı dengele"
 *   - Play kısa açıklama (80):  "Kalori saymadan, Türk sofrasının diliyle ailece dengeli beslenme ve sağlık."
 *   - Wikidata açıklaması:      nötr ve slogansız olmak zorundadır (topluluk kuralı)
 * Bu üçü dışında bir yerde tanım gerekiyorsa buradan gelir.
 */
export const MARKA_TANIM: Record<SiteLocale, string> = {
  tr:
    'afiet, kalori saydırmadan Türk sofrasının kendi ölçüleriyle ' +
    '(dilim, kase, avuç) ailelerin dengeli beslenme alışkanlığı kurmasına ' +
    'yardımcı olan bir mobil uygulamadır.',
  en:
    'afiet is a mobile app that helps families build balanced eating habits ' +
    "with the Turkish table's own measures (slices, bowls, handfuls) instead " +
    'of counting calories.',
}

/**
 * Wikidata kaydı: afiet'in üretken motorlara verdiği MAKİNE OKUNUR kimliği.
 * 25 Ağustos 2026'da açıldı; ifadeler, referanslar ve kayıt sırasında verilen
 * kararlar `research/2026-08-11-wikidata-kayit-hazirligi.md` dosyasında.
 *
 * NEDEN ŞEMAYA GİRİYOR: `sameAs`, bir varlığın "başka nerede aynı varlık
 * olarak kayıtlı olduğunu" söyler ve Wikidata bu grafiğin merkezinde durduğu
 * için kimlik çözümlemesindeki en güçlü tek bağdır. Bağ İKİ YÖNLÜ olmak
 * zorunda: kayıt `P856` ile siteye işaret ediyor, site de buradan kayda.
 * Tek yönlü bağın karşılığı yok.
 *
 * NEDEN Organization DEĞİL SoftwareApplication düğümünde: kayıt `P31` ile
 * "mobile app" + "health app" olarak tiplendi, yani UYGULAMAYI tanımlıyor,
 * şirketi değil. `sameAs` "aynı varlık" demektir; kurum düğümüne koymak
 * şirketi uygulamayla aynı şey ilan etmek olurdu. Şirket için ayrı bir kayıt
 * açılırsa o `schema.organization.sameAs` listesine girer (orası panelden
 * yönetilir ve prod'da override'ı VAR, bkz. seoDefaults > organization).
 *
 * NEDEN PANELDEN YÖNETİLMİYOR: bu bir kampanya metni değil, kimlik; ömründe
 * bir kez değişir. Gerekçe `ROBOTS_DIRECTIVES` ile aynı - pratikte hiç
 * değişmeyen bir sabit için iki repoya alan açmanın karşılığı yok. Yan
 * faydası büyük: panel override'ı bu alana ULAŞAMADIĞI için
 * `organization.sameAs`ı ezen boş dizi tuzağı buraya işlemiyor.
 */
export const WIKIDATA = {
  qid: 'Q141169446',
  url: 'https://www.wikidata.org/wiki/Q141169446',
} as const

/**
 * Marka künyesi: basın sayfasındaki hızlı bilgiler ve şema aynı yerden okur.
 * Yalnız DOĞRULANABİLİR alanlar durur; kullanıcı sayısı, indirme adedi gibi
 * kanıtlanamayan hiçbir rakam buraya girmez (basına verilen her sayı sorulur).
 */
export const MARKA_KUNYE = {
  ad: 'afiet',
  tagline: {
    tr: 'Sayma, dengele.',
    en: 'Stop counting. Start balancing.',
  } as Record<SiteLocale, string>,
  site: 'https://afiet.co',
  eposta: 'destek@afiet.co',
  platformlar: 'iOS, Android',
  /** Ülke adı iki dilde de Türkçe yazılır (resmî ad, BRAND.md). */
  ulke: 'Türkiye',
  dil: { tr: 'Türkçe', en: 'Turkish' } as Record<SiteLocale, string>,
  /**
   * Lansman penceresi. Gün DEĞİL ay verilir (kullanıcı kararı, 11 Ağu 2026):
   * Play'in 12 testçi x 14 gün kapısı henüz kapanmadı, birkaç günlük kayma
   * sayfayı yalanlamasın.
   */
  lansman: { tr: 'Ağustos 2026', en: 'August 2026' } as Record<SiteLocale, string>,
} as const

/** Dile göre tek cümlelik tanım; çağıran taraf hangi dilde olduğunu bilir. */
export function markaTanim(lang: SiteLocale = 'tr'): string {
  return MARKA_TANIM[lang]
}

/**
 * Mağaza adresleri ve afiet+ fiyatları - lansman günü tek satırla açılır.
 *
 * NEDEN BAYRAK VAR: iki adres de bugün 404 (uygulama henüz yayında değil) ve
 * abonelik ürünleri iki mağazada da oluşturulmadı. Motorlara 404 bir indirme
 * adresi ya da hiçbir yerden satın alınamayan bir fiyat bildirmek, hiç
 * bildirmemekten KÖTÜDÜR: şema sayfanın (ve mağazanın) söylemediğini iddia
 * etmiş olur. Bu yüzden şema hazır durur ama `yayinda` false iken
 * `installUrl` da `offers` da HİÇ basılmaz.
 *
 * LANSMAN GÜNÜ: yalnız `yayinda: true` yapılır, ikisi birden düşer. Adreslerin
 * doğruluğu önden bilinebilir çünkü ikisi de kimlikten türer (App Store
 * numarası `apps/mobile/eas.json > ascAppId`, Play adresi paket adı).
 *
 * FİYAT: `afiet-mobile/docs/fiyatlandirma.md`teki liste fiyatları. Lansmandaki
 * ilk yıl intro fiyatı (599,99) BİLİNÇLİ olarak burada yok - geçici kampanya
 * şemada yanlış yerdedir, süresi dolunca sessizce yalan söylemeye başlar.
 * Şema fiyatı ürünün liste fiyatıdır, kampanya mağazanın işidir.
 */
export const MAGAZA = {
  yayinda: false,
  appStore: 'https://apps.apple.com/tr/app/id6789522761',
  play: 'https://play.google.com/store/apps/details?id=co.afiet.app',
  paraBirimi: 'TRY',
  /**
   * Üç teklif de basılır (kullanıcı kararı, 13 Ağu 2026): indirme ücretsizdir
   * ve afiet+ ücretlidir. Yalnız "0" bildirmek "afiet ücretli mi" sorusuna
   * eksik cevap verir, yalnız aboneliği bildirmek uygulamayı paralı gösterir.
   */
  teklifler: [
    { fiyat: '0', ad: { tr: 'afiet', en: 'afiet' } },
    { fiyat: '129.99', ad: { tr: 'afiet+ aylık', en: 'afiet+ monthly' } },
    { fiyat: '799.99', ad: { tr: 'afiet+ yıllık', en: 'afiet+ annual' } },
  ],
} as const

/**
 * Basın sayfasındaki dosyaların TEK kaynağı. Yollar burada, etiketler
 * kopya dosyalarında (`content.ts > basin.varlikAdlari`, `content.en.ts >
 * pressEn.varlikAdlari`) ve ikisi aynı ANAHTARLA eşleşir: TR ve EN sayfaları
 * ayrı listeler taşısaydı biri eskir ve bir dilde kırık indirme kalırdı.
 *
 * Dosyaların kendisi `public/basin-kiti/` altındadır ve `npm run basin-kiti`
 * ile afiet-brand'den üretilir (script yalnız yerelde koşar, çıktısı repoda
 * yaşar). Klasör adı sayfanın yolundan (/basin) BİLEREK farklıdır: public/
 * altında rotayla aynı adı taşıyan klasör o rotayı gölgeler.
 */
export const BASIN_VARLIKLARI = {
  zip: '/basin-kiti/afiet-basin-kiti.zip',
  logolar: [
    { key: 'kilit', svg: '/basin-kiti/logo/lockup-horizontal.svg', koyu: false },
    { key: 'kelime', svg: '/basin-kiti/logo/wordmark.svg', koyu: false },
    { key: 'afi', svg: '/basin-kiti/logo/afi-emerald.svg', koyu: false },
    { key: 'beyaz', svg: '/basin-kiti/logo/lockup-horizontal-beyaz.svg', koyu: true },
  ],
  ekranlar: [
    { key: 'bugun', tam: '/basin-kiti/ekran/1-bugun.png', onizleme: '/basin-kiti/ekran/onizleme/1-bugun.jpg' },
    { key: 'kayit', tam: '/basin-kiti/ekran/2-hizli-kayit.png', onizleme: '/basin-kiti/ekran/onizleme/2-hizli-kayit.jpg' },
    { key: 'denge', tam: '/basin-kiti/ekran/3-denge.png', onizleme: '/basin-kiti/ekran/onizleme/3-denge.jpg' },
    { key: 'grubum', tam: '/basin-kiti/ekran/4-grubum.png', onizleme: '/basin-kiti/ekran/onizleme/4-grubum.jpg' },
    { key: 'vucudum', tam: '/basin-kiti/ekran/5-vucudum.png', onizleme: '/basin-kiti/ekran/onizleme/5-vucudum.jpg' },
    { key: 'rehber', tam: '/basin-kiti/ekran/6-besin-rehberi.png', onizleme: '/basin-kiti/ekran/onizleme/6-besin-rehberi.jpg' },
  ],
} as const

export type BasinLogoKey = (typeof BASIN_VARLIKLARI.logolar)[number]['key']
export type BasinEkranKey = (typeof BASIN_VARLIKLARI.ekranlar)[number]['key']

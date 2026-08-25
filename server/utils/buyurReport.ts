import type { NeonQueryFunction } from '@neondatabase/serverless'

/**
 * buyur.afiet.co funnel sayfasının okuma tarafı.
 *
 * Veri `buyur_events` tablosundan gelir. O tablonun SAHİBİ afiet-buyur
 * reposudur ve şemasını o kurar; burası yalnız OKUR. Tablo yoksa (sayfa
 * henüz tek bir ziyaret bile almamışsa) hata verilmez, `live: false` ile boş
 * bir kabuk dönülür: panelin "veri yok" ile "bağlantı koptu"yu birbirine
 * karıştırmaması için.
 *
 * Ölçüm çerezsizdir: ziyaretçi kimliği YOKTUR. Bu yüzden burada "tekil
 * ziyaretçi" diye bir metrik de yoktur ve uydurulmaz; görüntüleme, tık ve
 * ikisinin oranı vardır. Çıktı afiet-admin `src/services/analytics.ts`
 * içindeki `BuyurData` tipiyle BİREBİR aynıdır.
 */

type Sql = NeonQueryFunction<false, false>
export type BuyurRange = '7d' | '30d' | '90d'
const GUN: Record<BuyurRange, number> = { '7d': 7, '30d': 30, '90d': 90 }
export const parseBuyurRange = (v: unknown): BuyurRange => (v === '7d' || v === '90d' ? v : '30d')

export type BuyurBaglanti = { anahtar: string; etiket: string; grup: BuyurGrup; tik: number; pay: number }
export type BuyurGrup = 'magaza' | 'icerik' | 'sosyal' | 'diger'
type Kirilim = { key: string; label: string; sayi: number }

export type BuyurData = {
  generatedAt: string
  live: boolean
  range: BuyurRange
  totals: {
    goruntuleme: number
    tik: number
    tikOrani: number
    deltaGoruntuleme: number | null
    deltaTik: number | null
  }
  seri: { gun: string; goruntuleme: number; tik: number }[]
  baglantilar: BuyurBaglanti[]
  gruplar: { grup: BuyurGrup; label: string; tik: number }[]
  cihazlar: Kirilim[]
  isletimSistemleri: Kirilim[]
  ulkeler: Kirilim[]
  kaynaklar: { host: string; label: string; sayi: number }[]
}

/**
 * Sayfadaki sabit bağlantıların etiketleri. Sayfa yeni bir `data-tik`
 * anahtarı eklediğinde burası GÜNCELLENMESE de panel çalışır: tanınmayan
 * anahtar ham hâliyle "diğer" grubunda görünür. Bilinçli: bir bağlantının
 * etiketi eksik diye o bağlantının tıklarını gizlemek, veriyi kaybetmektir.
 */
const SABIT: Record<string, { etiket: string; grup: BuyurGrup }> = {
  appstore: { etiket: 'App Store', grup: 'magaza' },
  play: { etiket: 'Google Play', grup: 'magaza' },
  kunye: { etiket: 'afiet.co (logo)', grup: 'diger' },
  'kunye-alt': { etiket: 'afiet.co (alt bilgi)', grup: 'diger' },
  'blog-hepsi': { etiket: 'Blog (tümü)', grup: 'icerik' },
  'surum-hepsi': { etiket: 'Yenilikler (tümü)', grup: 'icerik' },
}
const SOSYAL: Record<string, string> = {
  instagram: 'Instagram', medium: 'Medium', substack: 'Substack', hashnode: 'Hashnode', linkedin: 'LinkedIn',
}
const INCE: Record<string, string> = {
  hesapla: 'Hesaplayıcılar', destek: 'Destek', basin: 'Basın kiti', iletisim: 'İletişim', gizlilik: 'Gizlilik',
}
export const GRUP_LABEL: Record<BuyurGrup, string> = {
  magaza: 'Mağaza', icerik: 'İçerik', sosyal: 'Sosyal', diger: 'Diğer',
}
const CIHAZ_LABEL: Record<string, string> = { mobile: 'Mobil', desktop: 'Masaüstü', tablet: 'Tablet' }
const ULKE_LABEL: Record<string, string> = {
  TR: 'Türkiye', DE: 'Almanya', US: 'ABD', NL: 'Hollanda', GB: 'Birleşik Krallık', FR: 'Fransa',
  AZ: 'Azerbaycan', AT: 'Avusturya', BE: 'Belçika', CH: 'İsviçre', SE: 'İsveç', IT: 'İtalya',
  ES: 'İspanya', CA: 'Kanada', AU: 'Avustralya', SA: 'Suudi Arabistan', AE: 'BAE',
}

const yuzde = (n: number, taban: number) => (taban > 0 ? Math.round((n / taban) * 1000) / 10 : 0)
/**
 * Önceki pencereye göre değişim yüzdesi.
 *
 * Önceki pencerede hiç veri yoksa `null` döner, 0 DEĞİL: panelde "%0" rozeti
 * "değişmedi" diye okunuyor, oysa kastedilen "kıyaslanacak bir şey yok".
 * Sayfa yeni yayına girdiği için ilk haftalarda taban hep boş olacak ve o
 * rozet her seferinde yalan söyleyecekti.
 */
const delta = (simdi: number, once: number): number | null =>
  once > 0 ? Math.round(((simdi - once) / once) * 100) : null

/** YYYY-MM-DD listesi: bugünden geriye `days` gün (UTC - panelin geri kalanıyla aynı). */
function gunAnahtarlari(days: number): string[] {
  const out: string[] = []
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const x = new Date(d)
    x.setUTCDate(d.getUTCDate() - i)
    out.push(x.toISOString().slice(0, 10))
  }
  return out
}

function bosVeri(range: BuyurRange, live: boolean): BuyurData {
  return {
    generatedAt: new Date().toISOString(),
    live,
    range,
    totals: { goruntuleme: 0, tik: 0, tikOrani: 0, deltaGoruntuleme: null, deltaTik: null },
    seri: gunAnahtarlari(GUN[range]).map((gun) => ({ gun, goruntuleme: 0, tik: 0 })),
    baglantilar: [],
    gruplar: [],
    cihazlar: [],
    isletimSistemleri: [],
    ulkeler: [],
    kaynaklar: [],
  }
}

/** Anahtarı okunur etikete ve gruba çevirir. Blog başlıkları çağıran taraftan gelir. */
export function anahtarCoz(anahtar: string, blogBasliklari: Map<string, string>): { etiket: string; grup: BuyurGrup } {
  const sabit = SABIT[anahtar]
  if (sabit) return sabit

  const ayrac = anahtar.indexOf(':')
  if (ayrac > 0) {
    const on = anahtar.slice(0, ayrac)
    const arka = anahtar.slice(ayrac + 1)
    if (on === 'blog') return { etiket: blogBasliklari.get(arka) ?? arka, grup: 'icerik' }
    if (on === 'surum') return { etiket: `Sürüm ${arka}`, grup: 'icerik' }
    if (on === 'sosyal') return { etiket: SOSYAL[arka] ?? arka, grup: 'sosyal' }
    if (on === 'ince') return { etiket: INCE[arka] ?? arka, grup: 'icerik' }
  }
  return { etiket: anahtar, grup: 'diger' }
}

export async function toplaBuyur(sql: Sql, range: BuyurRange): Promise<BuyurData> {
  const gun = GUN[range]

  // Tabloyu BURASI KURMAZ: sahibi afiet-buyur. Yoksa boş kabuk döner.
  const tabloRows = (await sql`SELECT to_regclass('public.buyur_events') IS NOT NULL AS mevcut`) as {
    mevcut?: boolean
  }[]
  if (!tabloRows[0]?.mevcut) return bosVeri(range, false)

  // Sorgular tipsiz döner, sonuç dizisi kullanım yerinde daraltılır
  // (analyticsReport.ts ile aynı desen: `Promise<T>`ye cast etmek
  // NeonQueryPromise ile örtüşmüyor).
  const [sayimRows, oncekiRows, gunlukRows, hedefRows, kirilimRows, kaynakRows] = await Promise.all([
    sql`
      SELECT event, count(*)::int AS n FROM buyur_events
      WHERE ts >= now() - make_interval(days => ${gun}) GROUP BY event
    `,
    sql`
      SELECT event, count(*)::int AS n FROM buyur_events
      WHERE ts >= now() - make_interval(days => ${gun * 2}) AND ts < now() - make_interval(days => ${gun})
      GROUP BY event
    `,
    sql`
      SELECT to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS gun, event, count(*)::int AS n
      FROM buyur_events WHERE ts >= now() - make_interval(days => ${gun})
      GROUP BY 1, 2
    `,
    sql`
      SELECT hedef, count(*)::int AS n FROM buyur_events
      WHERE event = 'tik' AND hedef IS NOT NULL AND ts >= now() - make_interval(days => ${gun})
      GROUP BY hedef ORDER BY n DESC LIMIT 60
    `,
    sql`
      SELECT 'cihaz' AS tur, coalesce(device, 'bilinmiyor') AS anahtar, count(*)::int AS n
      FROM buyur_events WHERE event = 'goruntuleme' AND ts >= now() - make_interval(days => ${gun}) GROUP BY 2
      UNION ALL
      SELECT 'os', coalesce(os, 'bilinmiyor'), count(*)::int
      FROM buyur_events WHERE event = 'goruntuleme' AND ts >= now() - make_interval(days => ${gun}) GROUP BY 2
      UNION ALL
      SELECT 'ulke', coalesce(country, 'bilinmiyor'), count(*)::int
      FROM buyur_events WHERE event = 'goruntuleme' AND ts >= now() - make_interval(days => ${gun}) GROUP BY 2
    `,
    sql`
      SELECT coalesce(referrer_host, '') AS host, count(*)::int AS n FROM buyur_events
      WHERE event = 'goruntuleme' AND ts >= now() - make_interval(days => ${gun})
      GROUP BY 1 ORDER BY n DESC LIMIT 12
    `,
  ])

  const sayimlar = sayimRows as { event: string; n: number }[]
  const oncekiSayimlar = oncekiRows as { event: string; n: number }[]
  const gunluk = gunlukRows as { gun: string; event: string; n: number }[]
  const hedefler = hedefRows as { hedef: string; n: number }[]
  const kirilimlar = kirilimRows as { tur: string; anahtar: string; n: number }[]
  const kaynaklar = kaynakRows as { host: string; n: number }[]

  const say = (satirlar: { event: string; n: number }[], e: string) => satirlar.find((r) => r.event === e)?.n ?? 0
  const goruntuleme = say(sayimlar, 'goruntuleme')
  const tik = say(sayimlar, 'tik')
  if (goruntuleme === 0 && tik === 0) return bosVeri(range, true)

  // Blog başlıkları: yalnız gerçekten tıklanmış slug'lar için tek sorgu.
  const slugler = hedefler.map((h) => h.hedef).filter((h) => h.startsWith('blog:')).map((h) => h.slice(5))
  const blogBasliklari = new Map<string, string>()
  if (slugler.length) {
    const basliklar = (await sql`SELECT slug, title FROM blog_posts WHERE slug = ANY(${slugler})`) as {
      slug: string
      title: string
    }[]
    for (const b of basliklar) blogBasliklari.set(b.slug, b.title)
  }

  const gorunumHarita = new Map<string, number>()
  const tikHarita = new Map<string, number>()
  for (const r of gunluk) (r.event === 'tik' ? tikHarita : gorunumHarita).set(r.gun, r.n)

  const baglantilar: BuyurBaglanti[] = hedefler.map((h) => {
    const { etiket, grup } = anahtarCoz(h.hedef, blogBasliklari)
    return { anahtar: h.hedef, etiket, grup, tik: h.n, pay: yuzde(h.n, tik) }
  })

  const grupSayaci = new Map<BuyurGrup, number>()
  for (const b of baglantilar) grupSayaci.set(b.grup, (grupSayaci.get(b.grup) ?? 0) + b.tik)
  const gruplar = [...grupSayaci.entries()]
    .map(([grup, adet]) => ({ grup, label: GRUP_LABEL[grup], tik: adet }))
    .sort((a, b) => b.tik - a.tik)

  const kirilim = (tur: string, etiketle: (k: string) => string): Kirilim[] =>
    kirilimlar
      .filter((r) => r.tur === tur)
      .map((r) => ({ key: r.anahtar, label: etiketle(r.anahtar), sayi: r.n }))
      .sort((a, b) => b.sayi - a.sayi)

  return {
    generatedAt: new Date().toISOString(),
    live: true,
    range,
    totals: {
      goruntuleme,
      tik,
      tikOrani: yuzde(tik, goruntuleme),
      deltaGoruntuleme: delta(goruntuleme, say(oncekiSayimlar, 'goruntuleme')),
      deltaTik: delta(tik, say(oncekiSayimlar, 'tik')),
    },
    seri: gunAnahtarlari(gun).map((g) => ({
      gun: g,
      goruntuleme: gorunumHarita.get(g) ?? 0,
      tik: tikHarita.get(g) ?? 0,
    })),
    baglantilar,
    gruplar,
    cihazlar: kirilim('cihaz', (k) => CIHAZ_LABEL[k] ?? k),
    isletimSistemleri: kirilim('os', (k) => k),
    ulkeler: kirilim('ulke', (k) => ULKE_LABEL[k] ?? (k === 'bilinmiyor' ? 'Bilinmiyor' : k)),
    // Boş referrer = doğrudan giriş (biyografi bağlantısı, QR, uygulama içi
    // tarayıcı). Instagram'ın kendi tarayıcısı referrer'ı çoğu zaman
    // göndermez; bu satırın büyük olması beklenen davranıştır, hata değil.
    kaynaklar: kaynaklar.map((r) => ({
      host: r.host,
      label: r.host || 'Doğrudan (referrer yok)',
      sayi: r.n,
    })),
  }
}

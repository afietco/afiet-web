import type { NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Google Discover verisinin yerel kopyası. Arama verisinden AYRI tablolarda
 * durur (`gsc_daily`/`gsc_rows`e karışmaz).
 *
 * NEDEN AYRI TABLO: Discover, Search Analytics API'sinin aynı ucundan gelir
 * ama farklı bir yüzeydir ve veri şekli çakışır:
 *   - `gsc_daily`nin birincil anahtarı yalnız `metric_date`. Discover günlüğü
 *     oraya yazılsa aynı günün arama satırının ÜZERİNE binerdi.
 *   - Discover'da `query` boyutu YOK (akış sorguya değil ilgiye dayanır),
 *     `gsc_rows.dimension` CHECK'i ise arama boyutları için kurulmuş.
 *   - Discover'da ORTALAMA POZİSYON YOK. Ortak tabloda position=0 yazmak
 *     `aggregateGsc`teki SUM(position*impressions)/SUM(impressions) ağırlıklı
 *     ortalamasını aşağı çeker ve panelde sessizce yanlış bir pozisyon
 *     gösterirdi. Bu yüzden burada position KOLONU BİLE YOK.
 *
 * "ÖLÇÜM YOK" İLE "SIFIR" AYRIMI: Search Console ARAYÜZÜ, mülk asgari gösterim
 * eşiğinin altındayken Discover raporunu hiç göstermez. API AYNI ŞEYİ YAPMAZ ve
 * bu fark bu işin en kolay yanlış yapılacak yeriydi:
 *
 *   26 Ağu 2026'da sc-domain:afiet.co'ya sorulduğunda `type:'discover'` +
 *   `dimensions:['date']` HTTP 200 ve 43 SATIR döndürdü; satırların HEPSİ
 *   gösterim=0, tıklama=0 idi (tarih aralığı arama tarafıyla birebir aynıydı,
 *   yani satırlar Discover'a değil mülkün veri geçmişine ait). `date+page` ve
 *   `date+country` ise gerçekten BOŞ döndü.
 *
 * Yani "veri yok" hâli boş yanıt DEĞİL, sıfır dolu satırlardır. `measured`
 * bu yüzden "satır var mı" diye SORMAZ, "sıfırdan büyük bir ölçüm var mı" diye
 * sorar. Satır varlığına baksaydı panel ilk günden itibaren dürüst görünen
 * ama aslında ölçümsüz bir sıfır çizgisi çizerdi.
 */

type Sql = NeonQueryFunction<false, false>
let ensured = false

/**
 * Discover'ın sorgusuz boyutları. Arama tarafındaki `query` burada YOKTUR;
 * istenirse API hata döner.
 *
 * Bu liste TEK KAYNAKTIR: hem senkron bu boyutları çeker, hem DB kısıtı
 * bundan üretilir (aşağıdaki `dimensionCheckSql`). Arama tarafındaki
 * `gsc_rows.dimension` CHECK'i SQL'e elle yazıldığı için listeyle ayrışabilir
 * durumda; burada o kapı kapalı.
 */
export const DISCOVER_DIMENSIONS = ['page', 'country'] as const
export type GscDiscoverDimension = (typeof DISCOVER_DIMENSIONS)[number]

/**
 * CHECK kısıtının değer listesi. DDL'de bind parametresi kullanılamaz, o yüzden
 * metin olarak gömülür; gömülmeden önce her değer sabit-kimlik biçimine karşı
 * doğrulanır, böylece `unsafe` gerçekten güvenli kalır.
 */
export function dimensionCheckSql(dimensions: readonly string[] = DISCOVER_DIMENSIONS): string {
  for (const d of dimensions) {
    if (!/^[a-z][a-z0-9_]*$/.test(d)) throw new Error(`gecersiz discover boyutu: ${d}`)
  }
  return dimensions.map((d) => `'${d}'`).join(',')
}

export type GscDiscoverRow = { key: string; clicks: number; impressions: number; ctr: number }

export type GscDiscoverData = {
  generatedAt: string
  range: '7d' | '30d' | '90d'
  /** Servis hesabı anahtarı yapılandırılmış mı (kurulum rozeti için). */
  connected: boolean
  /** Senkronun en son koştuğu an; hiç koşmadıysa null. */
  lastSyncAt: string | null
  /**
   * Discover BUGÜNE KADAR sıfırdan büyük bir ölçüm döndürdü mü. false iken
   * totals/series sıfır DEĞİL, ölçümsüzdür. Panel bu bayrağa bakarak
   * "ölçüm yok" yazar; "0 gösterim" YAZMAZ.
   *
   * Satır sayısına bakmaz: API eşik altındaki mülke sıfır dolu satırlar
   * döndürüyor (dosya başındaki nota bak).
   */
  measured: boolean
  totals: { clicks: number; impressions: number; ctrPct: number }
  /** `measured` false iken BOŞ döner; sıfır dolgulu seri çizdirilmez. */
  series: { date: string; clicks: number; impressions: number }[]
  pages: GscDiscoverRow[]
  countries: GscDiscoverRow[]
}

/**
 * Kısıt ekleme yarışı yutulur: iki eşzamanlı ensure'dan biri kısıtı önce
 * eklediğinde diğeri 42710 (duplicate_object) alır ve bu bir arıza değil,
 * yarışın normal sonucudur (contentStore'daki `addCheck` ile aynı ders).
 */
async function addCheck(add: () => Promise<unknown>) {
  try {
    await add()
  } catch (err) {
    if ((err as { code?: string })?.code !== '42710') throw err
  }
}

/**
 * Tek uçuş: `ensured` yalnız sonda dolduğu için, bayrak dolmadan gelen ikinci
 * çağrı DDL'i baştan koşardı. Burada bu, saf CREATE IF NOT EXISTS'ten daha
 * önemli: kısıt DÜŞÜRÜLÜP yeniden kuruluyor, yani iki tur çakışırsa biri
 * ötekinin kısıtını arada düşürebilir.
 */
let ensuring: Promise<void> | null = null

export async function ensureDiscoverTables(sql: Sql) {
  if (ensured) return
  ensuring ??= runDiscoverDdl(sql).finally(() => {
    ensuring = null
  })
  await ensuring
}

async function runDiscoverDdl(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS gsc_discover_daily (
      metric_date date PRIMARY KEY,
      clicks int NOT NULL DEFAULT 0,
      impressions int NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS gsc_discover_rows (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      metric_date date NOT NULL,
      dimension text NOT NULL,
      key text NOT NULL,
      clicks int NOT NULL DEFAULT 0,
      impressions int NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (metric_date, dimension, key)
    )
  `
  /* Boyut beyaz listesi TEK YERDEN (DISCOVER_DIMENSIONS) yazılır ve her
     ensure koşusunda yeniden kurulur. CREATE TABLE IF NOT EXISTS var olan
     tabloyu görmezden gelir, yani CHECK'i kod içinde genişletmek canlıda
     hiçbir şeyi değiştirmezdi; boyut ekleyen kişi bunu fark etmeden yayına
     çıkardı. Aynı desen analyticsStore ve contentStore'da da böyle. */
  await sql`ALTER TABLE gsc_discover_rows DROP CONSTRAINT IF EXISTS gsc_discover_rows_dimension_check`
  await addCheck(
    () => sql`
      ALTER TABLE gsc_discover_rows
        ADD CONSTRAINT gsc_discover_rows_dimension_check
        CHECK (dimension IN (${sql.unsafe(dimensionCheckSql())}))
    `,
  )
  await sql`CREATE INDEX IF NOT EXISTS gsc_discover_rows_dim_date_idx ON gsc_discover_rows (dimension, metric_date)`
  /* Tek satırlık senkron durumu. Gerekli, çünkü "hiç satır yok" tek başına
     iki farklı durumu birbirine karıştırır: cron hiç koşmadı mı, yoksa koştu
     da Google eşik altı olduğu için veri mi vermedi? İlki arıza, ikincisi
     normal. Rapor ve panel bu ikisini ayrı cümlelerle söyler. */
  await sql`
    CREATE TABLE IF NOT EXISTS gsc_discover_sync (
      id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      last_run_at timestamptz,
      last_rows int NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  ensured = true
}

export type DiscoverRowInput = {
  date: string
  dimension: GscDiscoverDimension
  key: string
  clicks: number
  impressions: number
}

/**
 * Boyut satırlarını TOPLU yazar.
 *
 * Neden tek tek değil: arama senkronu satır başına bir gidiş-dönüş yapıyor ve
 * bu, Vercel'in 60 saniyelik fonksiyon tavanıyla yarışan bir desen (SEO
 * nöbetçisinde 60'lık parti tam olarak buradan kesilmişti). Discover'da günlük
 * satır sayısı azdır ama ilk kurulumdaki geriye dönük doldurma 480 güne kadar
 * çıkabiliyor; gün x sayfa çarpımı orada tek tek yazmayı riskli yapar.
 */
export async function upsertDiscoverRows(sql: Sql, rows: DiscoverRowInput[], chunkSize = 500) {
  /* Parti içinde tekilleştirme ŞART: ON CONFLICT DO UPDATE aynı satırı tek
     komutta iki kez güncelleyemez (21000) ve tek bir tekrar TÜM partiyi
     düşürürdü. Son değer kazanır. */
  const seen = new Map<string, DiscoverRowInput>()
  for (const r of rows) seen.set(`${r.date}|${r.dimension}|${r.key}`, r)
  const unique = [...seen.values()]
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const params: unknown[] = []
    const tuples = chunk.map((r) => {
      const base = params.length
      params.push(r.date, r.dimension, r.key, r.clicks, r.impressions)
      return `($${base + 1}::date, $${base + 2}, $${base + 3}, $${base + 4}::int, $${base + 5}::int)`
    })
    await sql.query(
      `INSERT INTO gsc_discover_rows (metric_date, dimension, key, clicks, impressions)
       VALUES ${tuples.join(',')}
       ON CONFLICT (metric_date, dimension, key) DO UPDATE SET
         clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions, updated_at = now()`,
      params,
    )
  }
}

/** Günlük toplamları toplu yazar (aynı gerekçe: geriye dönük doldurma). */
export async function upsertDiscoverDailyMany(
  sql: Sql,
  rows: { date: string; clicks: number; impressions: number }[],
  chunkSize = 500,
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const params: unknown[] = []
    const tuples = chunk.map((r) => {
      const base = params.length
      params.push(r.date, r.clicks, r.impressions)
      return `($${base + 1}::date, $${base + 2}::int, $${base + 3}::int)`
    })
    await sql.query(
      `INSERT INTO gsc_discover_daily (metric_date, clicks, impressions)
       VALUES ${tuples.join(',')}
       ON CONFLICT (metric_date) DO UPDATE SET
         clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions, updated_at = now()`,
      params,
    )
  }
}

/** Senkron turunun bittiğini işaretler. Sıfır satırla biten tur da yazılır. */
export async function markDiscoverSync(sql: Sql, rows: number) {
  await sql`
    INSERT INTO gsc_discover_sync (id, last_run_at, last_rows)
    VALUES (1, now(), ${rows})
    ON CONFLICT (id) DO UPDATE SET
      last_run_at = now(), last_rows = EXCLUDED.last_rows, updated_at = now()
  `
}

type Row = Record<string, unknown>

const round1 = (n: number) => Math.round(n * 10) / 10

function toDimRow(row: Row): GscDiscoverRow {
  const clicks = Number(row.clicks)
  const impressions = Number(row.impressions)
  return {
    key: String(row.key),
    clicks,
    impressions,
    ctr: impressions > 0 ? round1((clicks / impressions) * 100) : 0,
  }
}

export async function aggregateDiscover(
  sql: Sql,
  range: '7d' | '30d' | '90d',
  connected: boolean,
): Promise<GscDiscoverData> {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30

  const stateRow = (await sql`SELECT last_run_at FROM gsc_discover_sync WHERE id = 1`) as Row[]
  const lastRun = stateRow[0]?.last_run_at
  /* İki bilinçli seçim var:
     1) SIFIRDAN BÜYÜK ölçüm aranır, satır varlığı değil. API eşik altındaki
        mülke sıfır dolu satırlar döndürüyor (dosya başındaki nota bak), yani
        `EXISTS (SELECT 1 ...)` ilk senkrondan sonra hep true olurdu.
     2) Soru PENCEREDEN BAĞIMSIZDIR: Discover bir kez gerçekten ölçüldüyse
        eşik aşılmıştır ve pencere içindeki boş gün gerçekten sıfır gündür.
        Pencereye bakarak sorsaydık, veri olmayan bir hafta 7 günlük görünümde
        "hiç ölçülmedi" diye okunurdu. */
  const everRow = (await sql`
    SELECT EXISTS (
      SELECT 1 FROM gsc_discover_daily WHERE impressions > 0 OR clicks > 0
    ) AS ever
  `) as Row[]
  const measured = Boolean(everRow[0]?.ever)

  const base = {
    generatedAt: new Date().toISOString(),
    range,
    connected,
    lastSyncAt: lastRun ? new Date(String(lastRun)).toISOString() : null,
    measured,
  }

  // Hiç ölçüm yoksa sıfır dolgulu seri ÜRETİLMEZ: boş seri, panelin yanlışlıkla
  // düz sıfır çizgisi çizmesini veri katmanında imkânsız kılar.
  if (!measured) {
    return { ...base, totals: { clicks: 0, impressions: 0, ctrPct: 0 }, series: [], pages: [], countries: [] }
  }

  const daily = (await sql`
    SELECT d::text AS date, COALESCE(g.clicks, 0) AS clicks, COALESCE(g.impressions, 0) AS impressions
    FROM generate_series(current_date - ${days - 1}::int, current_date, interval '1 day') AS d
    LEFT JOIN gsc_discover_daily g ON g.metric_date = d::date
    ORDER BY d
  `) as Row[]

  const totalsRow = (await sql`
    SELECT COALESCE(SUM(clicks), 0) AS clicks, COALESCE(SUM(impressions), 0) AS impressions
    FROM gsc_discover_daily WHERE metric_date >= current_date - ${days - 1}::int
  `) as Row[]
  const clicks = Number(totalsRow[0]?.clicks ?? 0)
  const impressions = Number(totalsRow[0]?.impressions ?? 0)

  const topOf = async (dimension: GscDiscoverDimension) =>
    ((await sql`
      SELECT key, SUM(clicks) AS clicks, SUM(impressions) AS impressions
      FROM gsc_discover_rows
      WHERE dimension = ${dimension} AND metric_date >= current_date - ${days - 1}::int
      GROUP BY key
      ORDER BY SUM(impressions) DESC, SUM(clicks) DESC
      LIMIT 20
    `) as Row[]).map(toDimRow)

  return {
    ...base,
    totals: {
      clicks,
      impressions,
      ctrPct: impressions > 0 ? round1((clicks / impressions) * 100) : 0,
    },
    series: daily.map((r) => ({
      date: String(r.date).slice(0, 10),
      clicks: Number(r.clicks),
      impressions: Number(r.impressions),
    })),
    pages: await topOf('page'),
    countries: await topOf('country'),
  }
}

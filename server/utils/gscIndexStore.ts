import type { NeonQueryFunction } from '@neondatabase/serverless'

/**
 * Sitemap'teki her URL'in Google indeks durumunun yerel kopyası.
 *
 * Neden ayrı tablo: `gsc_rows` yalnız GÖSTERİM ALMIŞ sayfaları bilir. Bir
 * sayfanın indeks dışında kalması orada hiç görünmez, çünkü indekste olmayan
 * sayfa zaten sıfır gösterim alır ve satırı hiç oluşmaz. "Neden trafik yok"
 * sorusunun cevabı çoğu zaman tam olarak burada duruyor.
 *
 * İki tablo var ve işleri farklı:
 *   gsc_index_status  URL başına GÜNCEL durum + bir önceki durum. "Bu hafta
 *                     ne değişti" sorusu buradan tam olarak cevaplanır.
 *   gsc_index_daily   Gün başına sayım. Eğri buradan çizilir; URL listesi
 *                     büyüyüp küçüldüğü için toplam da saklanır.
 */

type Sql = NeonQueryFunction<false, false>
let ensured = false

/**
 * Bizim sınıflandırmamız. Google'ın `coverageState` alanı YERELLEŞTİRİLMİŞ
 * düz metindir ("Keşfedildi - şu anda dizine eklenmiş değil") ve karşılaştırma
 * için kullanılamaz: dil değişince ya da Google ifadeyi güncelleyince sessizce
 * her satır "değişti" görünür. Bu yüzden durum, dile bağlı olmayan enum
 * alanlarından türetilir (`indexingState`, `robotsTxtState`, `verdict`) ve
 * ham metin yalnız referans olarak saklanır.
 */
export type IndexState =
  | 'indexed'
  | 'discovered'
  | 'crawled'
  | 'unknown'
  | 'noindex'
  | 'robots_blocked'
  | 'other'

/** Panelde ve mailde görünen Türkçe karşılıklar; tek kaynak burası. */
export const INDEX_STATE_LABELS: Record<IndexState, string> = {
  indexed: 'İndekste',
  discovered: 'Keşfedildi, eklenmedi',
  crawled: 'Tarandı, eklenmedi',
  unknown: 'Google bilmiyor',
  noindex: 'noindex ile dışarıda',
  robots_blocked: 'robots.txt engelli',
  other: 'Sınıflanamadı',
}

/** URL Inspection cevabının bizi ilgilendiren alanları. */
export type InspectResult = {
  verdict?: string
  coverageState?: string
  robotsTxtState?: string
  indexingState?: string
  pageFetchState?: string
  googleCanonical?: string
  lastCrawlTime?: string
}

/**
 * Google'ın cevabını bizim durumumuza çevirir. İstemcinin değil store'un
 * işidir: durum sözlüğünü tanımlayan dosya, ona giden yolu da tanımlamalı.
 *
 * Sıra önemlidir ve en spesifik olan önce gelir: bir sayfa hem `NEUTRAL`
 * hem `BLOCKED_BY_META_TAG` olabilir ve bizi ilgilendiren ikincisidir.
 * `verdict: PASS` tek başına indeksin kanıtıdır. Geri kalan üç ayrımı
 * (keşfedildi / tarandı / bilinmiyor) hiçbir enum alanı taşımadığı için
 * son çare olarak İngilizce `coverageState` metni okunur; istemci bu yüzden
 * cevabı İngilizce ister.
 */
export function classify(r: InspectResult): IndexState {
  const indexing = (r.indexingState ?? '').toUpperCase()
  const robots = (r.robotsTxtState ?? '').toUpperCase()
  const coverage = (r.coverageState ?? '').toLowerCase()

  if (robots === 'DISALLOWED') return 'robots_blocked'
  if (indexing === 'BLOCKED_BY_META_TAG' || indexing === 'BLOCKED_BY_HTTP_HEADER') return 'noindex'
  if ((r.verdict ?? '').toUpperCase() === 'PASS') return 'indexed'
  if (coverage.startsWith('discovered')) return 'discovered'
  if (coverage.startsWith('crawled')) return 'crawled'
  if (coverage.includes('unknown to google')) return 'unknown'
  return 'other'
}

export type IndexRow = {
  url: string
  state: IndexState
  previousState: IndexState | null
  changedAt: string | null
  verdict: string
  indexingState: string
  robotsState: string
  fetchState: string
  coverageRaw: string
  googleCanonical: string
  lastCrawlAt: string | null
  checkedAt: string
}

export async function ensureIndexTables(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS gsc_index_status (
      url text PRIMARY KEY,
      state text NOT NULL,
      previous_state text,
      changed_at timestamptz,
      verdict text NOT NULL DEFAULT '',
      indexing_state text NOT NULL DEFAULT '',
      robots_state text NOT NULL DEFAULT '',
      fetch_state text NOT NULL DEFAULT '',
      coverage_raw text NOT NULL DEFAULT '',
      google_canonical text NOT NULL DEFAULT '',
      last_crawl_at timestamptz,
      checked_at timestamptz NOT NULL DEFAULT now(),
      first_seen_at timestamptz NOT NULL DEFAULT now()
    )
  `
  // Taramanın sırası "en bayat önce"dir; sıralama indeksi o yüzden var.
  await sql`CREATE INDEX IF NOT EXISTS gsc_index_status_checked_idx ON gsc_index_status (checked_at)`
  await sql`CREATE INDEX IF NOT EXISTS gsc_index_status_state_idx ON gsc_index_status (state)`
  await sql`
    CREATE TABLE IF NOT EXISTS gsc_index_daily (
      metric_date date PRIMARY KEY,
      total int NOT NULL DEFAULT 0,
      indexed int NOT NULL DEFAULT 0,
      discovered int NOT NULL DEFAULT 0,
      crawled int NOT NULL DEFAULT 0,
      unknown int NOT NULL DEFAULT 0,
      noindex int NOT NULL DEFAULT 0,
      robots_blocked int NOT NULL DEFAULT 0,
      other int NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  ensured = true
}

/**
 * Bir URL'in durumunu yazar.
 *
 * `previous_state` yalnız durum GERÇEKTEN değiştiğinde kaydırılır. Her koşuda
 * kaydırmak, "bu hafta ne değişti" sorusunu her gün "hiçbir şey" diye
 * cevaplardı: bir sayfa cuma noindex olup pazartesiye kadar öyle kalırsa,
 * pazartesi raporunun onu görmesi gerekir.
 */
export async function upsertIndexRow(
  sql: Sql,
  row: Omit<IndexRow, 'previousState' | 'changedAt' | 'checkedAt'>,
) {
  await sql`
    INSERT INTO gsc_index_status
      (url, state, verdict, indexing_state, robots_state, fetch_state,
       coverage_raw, google_canonical, last_crawl_at, checked_at)
    VALUES
      (${row.url}, ${row.state}, ${row.verdict}, ${row.indexingState}, ${row.robotsState},
       ${row.fetchState}, ${row.coverageRaw}, ${row.googleCanonical}, ${row.lastCrawlAt}, now())
    ON CONFLICT (url) DO UPDATE SET
      previous_state = CASE
        WHEN gsc_index_status.state IS DISTINCT FROM EXCLUDED.state
        THEN gsc_index_status.state ELSE gsc_index_status.previous_state END,
      changed_at = CASE
        WHEN gsc_index_status.state IS DISTINCT FROM EXCLUDED.state
        THEN now() ELSE gsc_index_status.changed_at END,
      state = EXCLUDED.state,
      verdict = EXCLUDED.verdict,
      indexing_state = EXCLUDED.indexing_state,
      robots_state = EXCLUDED.robots_state,
      fetch_state = EXCLUDED.fetch_state,
      coverage_raw = EXCLUDED.coverage_raw,
      google_canonical = EXCLUDED.google_canonical,
      last_crawl_at = EXCLUDED.last_crawl_at,
      checked_at = now()
  `
}

/**
 * Sitemap'ten düşmüş URL'leri siler.
 *
 * Silinmezse yayından kaldırılmış bir sayfa sonsuza kadar "indekste değil"
 * sayılır ve her rapor onu bir eksik gibi gösterir. Sitemap her koşuda tam
 * çekildiği için bu karşılaştırma güvenlidir.
 */
export async function pruneMissingUrls(sql: Sql, urls: string[]): Promise<number> {
  if (urls.length === 0) return 0
  const rows = await sql`DELETE FROM gsc_index_status WHERE url <> ALL(${urls}::text[]) RETURNING url`
  return rows.length
}

/** Taranacak sıradaki URL'ler: hiç bakılmamışlar önce, sonra en bayatlar. */
export async function staleUrls(sql: Sql, urls: string[], olderThanHours: number, limit: number): Promise<string[]> {
  if (urls.length === 0) return []
  /* `AS t(url)` şart: `unnest(...) AS u` hem tabloya hem kolona aynı adı verir
     ve JOIN koşulundaki `u` belirsiz kalır. Sıra `NULLS FIRST` ile hiç
     bakılmamışları öne alır, yoksa yeni eklenen bir sayfa listenin sonunda
     bekler ve günlerce denetlenmeyebilir. */
  const rows = (await sql`
    SELECT t.url AS url
    FROM unnest(${urls}::text[]) AS t(url)
    LEFT JOIN gsc_index_status s ON s.url = t.url
    WHERE s.url IS NULL OR s.checked_at < now() - make_interval(hours => ${olderThanHours}::int)
    ORDER BY s.checked_at ASC NULLS FIRST
    LIMIT ${limit}
  `) as { url: string }[]
  return rows.map((r) => r.url)
}

export type IndexTally = Record<IndexState | 'total', number>

export async function tallyIndexStates(sql: Sql): Promise<IndexTally> {
  const rows = (await sql`SELECT state, count(*)::int AS n FROM gsc_index_status GROUP BY state`) as {
    state: string
    n: number
  }[]
  const out: IndexTally = {
    total: 0, indexed: 0, discovered: 0, crawled: 0,
    unknown: 0, noindex: 0, robots_blocked: 0, other: 0,
  }
  for (const r of rows) {
    if (r.state in out) out[r.state as IndexState] = r.n
    out.total += r.n
  }
  return out
}

/**
 * Günün sayımını yazar. Tarih Europe/Istanbul duvar saatinden alınır: rapor
 * da takvim de o saatte yaşıyor, UTC gününe yazmak gece yarısından sonraki
 * koşuları bir önceki güne düşürürdü.
 */
export async function writeIndexDaily(sql: Sql, tally: IndexTally) {
  await sql`
    INSERT INTO gsc_index_daily
      (metric_date, total, indexed, discovered, crawled, unknown, noindex, robots_blocked, other)
    VALUES (
      (now() AT TIME ZONE 'Europe/Istanbul')::date,
      ${tally.total}, ${tally.indexed}, ${tally.discovered}, ${tally.crawled},
      ${tally.unknown}, ${tally.noindex}, ${tally.robots_blocked}, ${tally.other})
    ON CONFLICT (metric_date) DO UPDATE SET
      total = EXCLUDED.total, indexed = EXCLUDED.indexed,
      discovered = EXCLUDED.discovered, crawled = EXCLUDED.crawled,
      unknown = EXCLUDED.unknown, noindex = EXCLUDED.noindex,
      robots_blocked = EXCLUDED.robots_blocked, other = EXCLUDED.other,
      updated_at = now()
  `
}

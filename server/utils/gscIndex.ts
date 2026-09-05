import type { H3Event } from 'h3'
import type { Sql } from './db'
import { accessToken, gscProperty, gscServiceAccount } from './gsc'
import {
  classify,
  pruneMissingUrls,
  staleUrls,
  tallyIndexStates,
  upsertIndexRow,
  writeIndexDaily,
  type IndexTally,
  type InspectResult,
} from './gscIndexStore'

/**
 * Google Search Console URL Inspection istemcisi.
 *
 * Kapsam `webmasters.readonly` bu uç için YETERLİDİR (9 Ağu 2026'da canlıda
 * ölçüldü). Salt okunur olan yalnız YAZMA tarafıdır: indeksleme talebi
 * API'den yapılamaz, GSC arayüzünden elle tıklanır. Okuma tarafında her
 * sayfanın durumu toplu çekilebiliyor.
 *
 * `searchanalytics` ile aynı servis hesabı ve aynı token akışı kullanılır
 * (gsc.ts > accessToken).
 */

const INSPECT_URL = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'

/**
 * İngilizce istenir ve bu bilinçlidir. `coverageState` yerelleştirilmiş düz
 * metindir; Türkçe istenirse sınıflandırma Türkçe cümlelere bağlanır ve dil
 * ayarı değişince sessizce bozulur. Karar mantığı zaten enum alanlarına
 * dayanıyor, bu yalnız son çare eşleşmesini sabitler.
 */
const INSPECT_LANG = 'en'

async function inspectOne(token: string, property: string, url: string): Promise<InspectResult> {
  const response = await fetch(INSPECT_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: property, languageCode: INSPECT_LANG }),
  })
  if (!response.ok) {
    let reason = ''
    try {
      const err = (await response.json()) as { error?: { status?: string; message?: string } }
      reason = err.error?.status ?? ''
    } catch { /* gövde yok */ }
    throw new Error(`urlinspection ${response.status}${reason ? ` (${reason})` : ''}`)
  }
  const payload = (await response.json()) as {
    inspectionResult?: { indexStatusResult?: InspectResult }
  }
  return payload.inspectionResult?.indexStatusResult ?? {}
}

/**
 * Sitemap'teki URL listesi.
 *
 * Kendi sitemap route'umuzdan okunur, ayrı bir liste kurulmaz: denetlenmesi
 * gereken küme, tanım gereği arama motoruna BİLDİRDİĞİMİZ kümedir. İkinci bir
 * liste tutmak, sitemap büyüdüğünde sessizce eksik denetim yapardı.
 */
export async function sitemapUrls(): Promise<string[]> {
  /* Göreli yol bilinçlidir: Nitro'nun $fetch'i onu AĞA ÇIKMADAN yerel
     handler'a bağlar. Mutlak adres yazmak isteği kendi fonksiyonumuza geri
     döndürür ve hem gereksiz bir tur hem de bot log'unda sahte bir satır
     üretirdi. Gelen isteğin başlıkları da böylece miras alınmaz. */
  const xml = await $fetch<string>('/sitemap.xml', {
    headers: { accept: 'application/xml' },
    responseType: 'text',
  })
  return [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.trim()).filter(Boolean)
}

export type IndexSweepSummary = {
  sitemapUrls: number
  checked: number
  failed: number
  pruned: number
  remaining: number
  tally: IndexTally
}

/**
 * Bir turda kaç URL denetlenir.
 *
 * Tam liste tek istekte taranmaz: 157 URL'lik bir tur dakikalar sürer ve
 * Vercel fonksiyon tavanını aşar. Bunun yerine her tur en bayat N URL'i alır,
 * Scheduler işi gün içinde birkaç kez koşar ve liste bir günde tamamen
 * yenilenir. Tavan aşılırsa yarım kalan tur bir sonrakinde kaldığı yerden
 * devam eder, çünkü sıra `checked_at`ten türüyor.
 */
/* 20, TAHMİN DEĞİL ÖLÇÜM: ilk prod turunda 60'lık parti altmış saniyelik
   Vercel tavanına takıldı ve 32 URL yazıldıktan sonra kesildi. Daha kötüsü,
   günlük özet turun SONUNDA yazıldığı için hiç yazılmadı: yarım tur sessizce
   sayımsız kalıyordu. Inspection ucu istek başına ~7 saniye sürüyor, dört
   koşutla saniyede ~0,5 URL. 20 URL ~40 saniye, tavanın altında payı var. */
const DEFAULT_BATCH = 20
const DEFAULT_STALE_HOURS = 20
const CONCURRENCY = 4

export async function sweepIndexStatus(
  event: H3Event,
  sql: Sql,
  opts: { batch?: number; staleHours?: number } = {},
): Promise<IndexSweepSummary> {
  const sa = gscServiceAccount(event)
  const property = gscProperty(event)
  if (!sa || !property) throw createError({ statusCode: 503, statusMessage: 'gsc_yapilandirilmadi' })

  const urls = await sitemapUrls()
  if (urls.length === 0) throw createError({ statusCode: 502, statusMessage: 'sitemap_bos' })

  const pruned = await pruneMissingUrls(sql, urls)
  const batch = Math.min(200, Math.max(1, opts.batch ?? DEFAULT_BATCH))
  const staleHours = Math.max(0, opts.staleHours ?? DEFAULT_STALE_HOURS)
  const queue = await staleUrls(sql, urls, staleHours, batch)

  const token = await accessToken(sa)
  let checked = 0
  let failed = 0
  let cursor = 0

  const worker = async () => {
    while (cursor < queue.length) {
      const url = queue[cursor++]!
      try {
        const result = await inspectOne(token, property, url)
        await upsertIndexRow(sql, {
          url,
          state: classify(result),
          verdict: result.verdict ?? '',
          indexingState: result.indexingState ?? '',
          robotsState: result.robotsTxtState ?? '',
          fetchState: result.pageFetchState ?? '',
          coverageRaw: result.coverageState ?? '',
          googleCanonical: result.googleCanonical ?? '',
          lastCrawlAt: result.lastCrawlTime ?? null,
        })
        checked += 1
      } catch (err) {
        /* Hatalı URL'in satırı YAZILMAZ: `checked_at` güncellenmediği için
           sıradaki turda yeniden denenir. Eski durumu bozup "sınıflanamadı"
           yazmak, geçici bir API hatasını kalıcı bir bulguya çevirirdi. */
        failed += 1
        console.error('[gsc-index] denetim düştü:', url, err instanceof Error ? err.message : err)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker))

  const tally = await tallyIndexStates(sql)
  await writeIndexDaily(sql, tally)

  return {
    sitemapUrls: urls.length,
    checked,
    failed,
    pruned,
    remaining: Math.max(0, queue.length - checked - failed),
    tally,
  }
}

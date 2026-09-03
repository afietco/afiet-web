import type { NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'
import { CONTENT_TZ } from './contentTypes'
import { upsertMetric } from './contentStore'
import type { SyncSummary } from './socialTypes'
import { markSynced, upsertPost, type AccountWithToken } from './socialStore'
import { decryptToken } from './socialCrypto'
import {
  YT_WINDOWS,
  replaceYouTubeDemographics,
  replaceYouTubeVideos,
  upsertSubscriberTotal,
  upsertYouTubeDaily,
  upsertYouTubeRow,
  type YtDimension,
  type YtRange,
  type YtVideoInput,
  type YtWindow,
} from './youtubeStore'

/**
 * YouTube otomatik ölçüm: YouTube Analytics API v2 (kanal verisi) + Data API v3
 * (video başlıkları, süre, abone sayısı).
 *
 * INSTAGRAM'DAN ÜÇ ESASLI FARK, ÜÇÜ DE TASARIMI BELİRLEDİ:
 *
 * 1. SERVİS HESABI ÇALIŞMAZ. YouTube API'leri servis hesabını kabul etmiyor
 *    (içerik sahibi/CMS hesapları hariç, bizde o yok). GSC'deki `gsc.ts`
 *    deseni bu yüzden kopyalanamadı: kanal sahibi bir kez OAuth'la izin
 *    veriyor, biz REFRESH TOKEN'ı şifreli saklıyoruz.
 *
 * 2. TOKEN YENİLEME TAKVİMİ YOK. Google'ın refresh token'ı süresizdir; her
 *    turda ondan kısa ömürlü access token üretilir. Bu yüzden hesabın
 *    `expires_at`i NULL kalır ve panel rozeti hep "bağlı" der. Token yalnız
 *    iptal edilirse ya da OAuth onay ekranı "Testing" modundaysa ölür
 *    (o modda Google refresh token'ı 7 GÜNDE geçersiz kılar, uygulamanın
 *    "In production" olması şart).
 *
 * 3. GÜN KIRILIMI GERÇEKTİR. Meta ömür toplamı verdiği için Instagram'da fark
 *    hesabı yapılıyor; YouTube gün gün veriyor, o yüzden burada o hile yok.
 *    Ama `video` boyutu `day` ile BİRLEŞMİYOR ve demografi yalnız yüzde
 *    veriyor: o ikisi pencere anlık görüntüsü olarak saklanır
 *    (bkz. youtubeStore.ts başlığı).
 *
 * Ağ çağrıları `deps.fetch` üzerinden yapılır: testler canned yanıtlarla
 * eşleştirme ve yazma yolunu sürebiliyor.
 */

type Sql = NeonQueryFunction<false, false>

const ANALYTICS = 'https://youtubeanalytics.googleapis.com/v2/reports'
const DATA = 'https://www.googleapis.com/youtube/v3'
const AUTHORIZE = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN = 'https://oauth2.googleapis.com/token'

/**
 * İkisi de HASSAS kapsam sayılır (Google doğrulaması ister). Kendi kanalımız
 * için doğrulanmamış uygulama uyarısı yeterli, ama uygulama "In production"
 * olmalı: "Testing" modunda refresh token 7 günde ölür.
 */
export const YT_SCOPES = [
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ')

/** Shorts eşiği: YouTube Ekim 2024'ten beri 3 dakikaya kadarını Shorts sayıyor. */
const SHORTS_MAX_SECONDS = 180

/** Bir turda en fazla kaç video satırı çekilir (pencere başına). */
const VIDEO_LIMIT = 200

export type YtConfig = { clientId: string; clientSecret: string; redirectUri: string }
type Deps = { fetch: typeof fetch }
const realDeps: Deps = { fetch: (...args) => fetch(...args) }

export function ytConfig(event: H3Event): YtConfig | null {
  const c = useRuntimeConfig(event)
  const clientId = String(c.ytClientId ?? '').trim()
  const clientSecret = String(c.ytClientSecret ?? '').trim()
  const redirectUri = String(c.ytRedirectUri ?? '').trim()
  return clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null
}

export function requireYtConfig(event: H3Event): YtConfig {
  const config = ytConfig(event)
  if (!config) throw createError({ statusCode: 503, statusMessage: 'youtube_yapilandirilmadi' })
  return config
}

/**
 * İzin ekranının adresi. `access_type=offline` + `prompt=consent` REFRESH
 * TOKEN için şarttır: Google ikinci bağlanmada onu yalnız `prompt=consent`
 * varsa tekrar gönderir, yoksa yeniden bağlama sessizce token'sız kalır.
 */
export function youtubeAuthorizeUrl(config: YtConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: YT_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `${AUTHORIZE}?${params.toString()}`
}

/** Google hatalarını token sızdırmadan okunur mesaja çevirir. */
async function readError(res: Response, where: string): Promise<string> {
  let detail = ''
  try {
    const body = (await res.json()) as {
      error?: string | { message?: string; status?: string }
      error_description?: string
    }
    if (typeof body.error === 'string') detail = `${body.error} ${body.error_description ?? ''}`.trim()
    else if (body.error) detail = `${body.error.status ?? ''} ${body.error.message ?? ''}`.trim()
  } catch {
    detail = await res.text().catch(() => '')
  }
  // URL loglanmaz: sorgu dizesinde access_token olabilir.
  return `${where}: ${res.status} ${detail.slice(0, 200)}`
}

async function getJson<T>(url: string, token: string, where: string, deps: Deps): Promise<T> {
  const res = await deps.fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(await readError(res, where))
  return (await res.json()) as T
}

// ── OAuth ────────────────────────────────────────────────────────────────────

/**
 * code → refresh token (+ ilk access token). Refresh token DÖNMEZSE hata
 * verilir: token'sız bir bağlantı ertesi gün sessizce çalışmaz, o yüzden
 * yarım bağlamak yerine açıkça düşer.
 */
export async function exchangeYouTubeCode(
  config: YtConfig,
  code: string,
  deps: Deps = realDeps,
): Promise<{ refreshToken: string; accessToken: string }> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    code,
  })
  const res = await deps.fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) throw new Error(await readError(res, 'token takasi'))
  const json = (await res.json()) as { refresh_token?: string; access_token?: string }
  if (!json.refresh_token) {
    throw new Error('token takasi: refresh_token dönmedi (izin ekranı prompt=consent ile açılmalı)')
  }
  return { refreshToken: json.refresh_token, accessToken: json.access_token ?? '' }
}

/** Refresh token → kısa ömürlü access token (her senkron turunda bir kez). */
export async function accessTokenFrom(
  config: YtConfig,
  refreshToken: string,
  deps: Deps = realDeps,
): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  const res = await deps.fetch(TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const message = await readError(res, 'access token')
    // invalid_grant = izin geri çekildi ya da uygulama hâlâ "Testing" modunda
    // (o modda refresh token 7 günde ölür). Panelde okunur karşılığı olsun.
    if (message.includes('invalid_grant')) {
      throw new Error('yetki düşmüş: kanalı panelden yeniden bağla (OAuth uygulaması "In production" olmalı)')
    }
    throw new Error(message)
  }
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error('access token: access_token yok')
  return json.access_token
}

// ── Data API ─────────────────────────────────────────────────────────────────

export type YtChannel = {
  id: string
  title: string
  handle: string
  subscribers: number
  videoCount: number
  startedAt: string
}

export async function fetchChannel(token: string, deps: Deps = realDeps): Promise<YtChannel> {
  const json = await getJson<{
    items?: {
      id?: string
      snippet?: { title?: string; customUrl?: string; publishedAt?: string }
      statistics?: { subscriberCount?: string; videoCount?: string }
    }[]
  }>(`${DATA}/channels?part=snippet,statistics&mine=true`, token, 'kanal bilgisi', deps)
  const item = json.items?.[0]
  if (!item?.id) throw new Error('kanal bilgisi: kanal bulunamadı (hesapta YouTube kanalı var mı?)')
  return {
    id: String(item.id),
    title: item.snippet?.title ?? '',
    handle: item.snippet?.customUrl ?? '',
    subscribers: Number(item.statistics?.subscriberCount ?? 0) || 0,
    videoCount: Number(item.statistics?.videoCount ?? 0) || 0,
    startedAt: (item.snippet?.publishedAt ?? '').slice(0, 10) || '2005-02-14',
  }
}

export type YtVideoDetail = { id: string; title: string; publishedAt: string | null; format: string }

/** ISO 8601 süre ("PT4M13S") → saniye. Tanınmayan biçim 0 döner. */
export function durationSeconds(iso: string): number {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? '')
  if (!m) return 0
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0)
}

/**
 * Video ayrıntıları (50'lik gruplar hâlinde). Shorts ayrımı SÜREDEN yapılır:
 * Data API'de "bu bir Shorts" bayrağı yok, `/shorts/<id>` adresini yoklamak
 * ise video başına bir istek daha demek. Süre eşiği yanlış sınıflarsa panelde
 * biçim etiketi yanlış olur, sayılar doğru kalır.
 */
export async function fetchVideoDetails(
  token: string,
  ids: string[],
  deps: Deps = realDeps,
): Promise<YtVideoDetail[]> {
  const out: YtVideoDetail[] = []
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const json = await getJson<{
      items?: { id?: string; snippet?: { title?: string; publishedAt?: string }; contentDetails?: { duration?: string } }[]
    }>(`${DATA}/videos?part=snippet,contentDetails&id=${chunk.join(',')}`, token, 'video ayrintisi', deps)
    for (const item of json.items ?? []) {
      if (!item.id) continue
      const seconds = durationSeconds(item.contentDetails?.duration ?? '')
      out.push({
        id: String(item.id),
        title: item.snippet?.title ?? '',
        publishedAt: item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).toISOString() : null,
        format: seconds > 0 && seconds <= SHORTS_MAX_SECONDS ? 'shorts' : 'video',
      })
    }
  }
  return out
}

// ── Analytics API ────────────────────────────────────────────────────────────

type ReportQuery = {
  startDate: string
  endDate: string
  metrics: string
  dimensions?: string
  sort?: string
  maxResults?: number
}

type Report = { headers: string[]; rows: (string | number)[][] }

async function runReport(token: string, q: ReportQuery, deps: Deps = realDeps): Promise<Report> {
  const params = new URLSearchParams({
    ids: 'channel==MINE',
    startDate: q.startDate,
    endDate: q.endDate,
    metrics: q.metrics,
  })
  if (q.dimensions) params.set('dimensions', q.dimensions)
  if (q.sort) params.set('sort', q.sort)
  if (q.maxResults) params.set('maxResults', String(q.maxResults))
  const json = await getJson<{ columnHeaders?: { name?: string }[]; rows?: (string | number)[][] }>(
    `${ANALYTICS}?${params.toString()}`,
    token,
    `rapor(${q.dimensions ?? 'toplam'})`,
    deps,
  )
  return {
    headers: (json.columnHeaders ?? []).map((h) => String(h.name ?? '')),
    rows: json.rows ?? [],
  }
}

/** Satırı sütun adına göre okumak için küçük yardımcı. */
function reader(report: Report) {
  const index = new Map(report.headers.map((h, i) => [h, i]))
  return (row: (string | number)[], name: string): string | number => {
    const i = index.get(name)
    return i === undefined ? 0 : (row[i] ?? 0)
  }
}

const int = (v: string | number): number => Math.round(Number(v) || 0)
const real = (v: string | number): number => Number(v) || 0

/** Bugünün İstanbul günü (YYYY-MM-DD); pencerelerin bitiş tarihi. */
function istanbulToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CONTENT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function daysBefore(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

/**
 * Videoyu takvim etkinliğiyle eşle: önce platform kimliği, sonra yayın URL'i.
 * YouTube adresi üç biçimde yazılabildiği için (watch?v=, youtu.be/, /shorts/)
 * URL eşleşmesi kimliğin GEÇTİĞİ adresi arar. Başlık benzerliğine BAKILMAZ:
 * yanlış eşleşme, eşleşmemekten kötüdür (Instagram'daki kuralın aynısı).
 */
async function matchYouTubeItem(sql: Sql, videoId: string): Promise<number | null> {
  const byId = await sql`SELECT id FROM content_items WHERE platform_post_id = ${videoId} LIMIT 1`
  if (byId.length) return Number((byId[0] as Record<string, unknown>).id)
  const byUrl = await sql`
    SELECT id FROM content_items
    WHERE channel = 'youtube' AND published_url <> '' AND position(${videoId} in published_url) > 0
    LIMIT 1
  `
  return byUrl.length ? Number((byUrl[0] as Record<string, unknown>).id) : null
}

// ── Senkron ──────────────────────────────────────────────────────────────────

const DIMENSION_FIELD: Record<YtDimension, string> = {
  traffic: 'insightTrafficSourceType',
  country: 'country',
  device: 'deviceType',
}

function videoRows(report: Report, rangeKey: YtWindow): YtVideoInput[] {
  const read = reader(report)
  return report.rows
    .map((row) => ({
      rangeKey,
      videoId: String(read(row, 'video')),
      views: int(read(row, 'views')),
      minutesWatched: int(read(row, 'estimatedMinutesWatched')),
      avgViewDuration: int(read(row, 'averageViewDuration')),
      avgViewPercentage: real(read(row, 'averageViewPercentage')),
      subscribersGained: int(read(row, 'subscribersGained')),
      likes: int(read(row, 'likes')),
      comments: int(read(row, 'comments')),
      shares: int(read(row, 'shares')),
    }))
    .filter((v) => v.videoId)
}

/**
 * Bir turun tamamı. Tek bir sorgunun hatası turu DÜŞÜRMEZ: her blok kendi
 * try'ında, hatası `summary.errors`a yazılır ve panelde rozet olarak görünür.
 * Sebep: demografi ya da cihaz kırılımı boş dönmesin diye günlük seriyi de
 * kaybetmek, kaybın büyüğünü seçmek olurdu.
 */
export async function syncYouTube(
  event: H3Event,
  sql: Sql,
  account: AccountWithToken,
  deps: Deps = realDeps,
  windowDays = 7,
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    platform: 'youtube',
    handle: account.handle,
    fetched: 0,
    matched: 0,
    measured: 0,
    refreshed: false,
    errors: [],
  }

  const config = requireYtConfig(event)
  const refreshToken = await decryptToken(event, account.encryptedToken)
  const token = await accessTokenFrom(config, refreshToken, deps)

  const today = istanbulToday()
  const windowStart = daysBefore(today, Math.max(1, windowDays) - 1)

  // 1) Kanal: abone sayısı + kanalın açılış tarihi (ömür penceresinin başı).
  let channel: YtChannel | null = null
  try {
    channel = await fetchChannel(token, deps)
    await upsertSubscriberTotal(sql, today, channel.subscribers)
    summary.handle = channel.handle || channel.title || account.handle
    // Kanal adı YouTube'da değişebilir; panel eski adı göstermesin diye
    // hesabın handle'ı her turda tazelenir (bağlama anında yazılan değer
    // yoksa da burada dolar).
    if (summary.handle && summary.handle !== account.handle) {
      await sql`UPDATE social_accounts SET handle = ${summary.handle}, updated_at = now() WHERE id = ${account.id}`
    }
  } catch (err) {
    summary.errors.push(err instanceof Error ? err.message : 'kanal bilgisi alinamadi')
  }

  // 2) Günlük kanal serisi (tek sorgu, `day` boyutu).
  try {
    const report = await runReport(
      token,
      {
        startDate: windowStart,
        endDate: today,
        dimensions: 'day',
        metrics: 'views,estimatedMinutesWatched,averageViewPercentage,subscribersGained,subscribersLost',
      },
      deps,
    )
    const read = reader(report)
    for (const row of report.rows) {
      await upsertYouTubeDaily(sql, {
        date: String(read(row, 'day')),
        views: int(read(row, 'views')),
        minutesWatched: int(read(row, 'estimatedMinutesWatched')),
        avgViewPercentage: real(read(row, 'averageViewPercentage')),
        subscribersGained: int(read(row, 'subscribersGained')),
        subscribersLost: int(read(row, 'subscribersLost')),
      })
    }
  } catch (err) {
    summary.errors.push(err instanceof Error ? err.message : 'gunluk seri alinamadi')
  }

  // 3) Kırılımlar: üçü de `day` ile birlikte sorgulanabiliyor, o yüzden tarih
  //    başına satır yazılır ve panel aralığı tek SQL ile toplar.
  for (const dimension of Object.keys(DIMENSION_FIELD) as YtDimension[]) {
    try {
      const field = DIMENSION_FIELD[dimension]
      const report = await runReport(
        token,
        {
          startDate: windowStart,
          endDate: today,
          dimensions: `day,${field}`,
          metrics: 'views,estimatedMinutesWatched',
          sort: '-views',
        },
        deps,
      )
      const read = reader(report)
      for (const row of report.rows) {
        const key = String(read(row, field))
        if (!key) continue
        await upsertYouTubeRow(
          sql,
          String(read(row, 'day')),
          dimension,
          key,
          int(read(row, 'views')),
          int(read(row, 'estimatedMinutesWatched')),
        )
      }
    } catch (err) {
      summary.errors.push(`${dimension}: ${err instanceof Error ? err.message : 'kirilim alinamadi'}`)
    }
  }

  // 4) Pencere anlık görüntüleri: video listesi (dört pencere) ve demografi
  //    (üç pencere). `video` boyutu `day` ile birleşmediği, demografi de yalnız
  //    yüzde döndürdüğü için başka yolu yok.
  const lifetimeStart = channel?.startedAt ?? '2005-02-14'
  const videosByWindow = new Map<YtWindow, YtVideoInput[]>()
  for (const rangeKey of YT_WINDOWS) {
    try {
      const startDate = rangeKey === 'omur' ? lifetimeStart : daysBefore(today, ({ '7d': 7, '30d': 30, '90d': 90 }[rangeKey] ?? 30) - 1)
      const report = await runReport(
        token,
        {
          startDate,
          endDate: today,
          dimensions: 'video',
          metrics:
            'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,likes,comments,shares',
          sort: '-views',
          maxResults: VIDEO_LIMIT,
        },
        deps,
      )
      const rows = videoRows(report, rangeKey)
      videosByWindow.set(rangeKey, rows)
      await replaceYouTubeVideos(sql, rangeKey, rows)
    } catch (err) {
      summary.errors.push(`video(${rangeKey}): ${err instanceof Error ? err.message : 'alinamadi'}`)
    }
  }

  for (const rangeKey of ['7d', '30d', '90d'] as YtRange[]) {
    try {
      const report = await runReport(
        token,
        {
          startDate: daysBefore(today, ({ '7d': 7, '30d': 30, '90d': 90 }[rangeKey] ?? 30) - 1),
          endDate: today,
          dimensions: 'ageGroup,gender',
          metrics: 'viewerPercentage',
          sort: '-viewerPercentage',
        },
        deps,
      )
      const read = reader(report)
      const rows = report.rows
        .map((row) => ({
          key: `${String(read(row, 'gender')).toLowerCase()}:${String(read(row, 'ageGroup'))}`,
          sharePct: real(read(row, 'viewerPercentage')),
        }))
        .filter((r) => r.sharePct > 0)
      await replaceYouTubeDemographics(sql, rangeKey, rows)
    } catch (err) {
      summary.errors.push(`demografi(${rangeKey}): ${err instanceof Error ? err.message : 'alinamadi'}`)
    }
  }

  // 5) Video kataloğu: başlık/süre Data API'den, eşleştirme ve takvim kopyası
  //    ÖMÜR penceresinden. İçerik takvimine yazılan sayı videonun ömür
  //    toplamıdır (Instagram'da da öyle), 90 günlük pencere değil.
  const lifetime = videosByWindow.get('omur') ?? []
  summary.fetched = lifetime.length
  if (lifetime.length) {
    try {
      const details = await fetchVideoDetails(token, lifetime.map((v) => v.videoId), deps)
      const byId = new Map(details.map((d) => [d.id, d]))
      for (const video of lifetime) {
        try {
          const detail = byId.get(video.videoId)
          const itemId = await matchYouTubeItem(sql, video.videoId)
          await upsertPost(sql, {
            platform: 'youtube',
            externalId: video.videoId,
            permalink: `https://www.youtube.com/watch?v=${video.videoId}`,
            publishedAt: detail?.publishedAt ?? null,
            mediaType: detail?.format ?? 'video',
            caption: (detail?.title ?? '').slice(0, 2200),
            thumbnailUrl: null,
            itemId,
          })
          if (!itemId) continue
          summary.matched += 1

          await sql`
            UPDATE content_items SET platform_post_id = ${video.videoId}, updated_at = now()
            WHERE id = ${itemId} AND (platform_post_id IS NULL OR platform_post_id = '')
          `

          await upsertMetric(sql, {
            itemId,
            metricDate: today,
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            shares: video.shares,
            saves: 0,
            clicks: 0,
            // YouTube "erişim" (benzersiz kişi) vermiyor; 0 bırakılır ki
            // panelde uydurma bir sayı görünmesin.
            reach: 0,
            interactions: video.likes + video.comments + video.shares,
            notes: '',
            source: 'youtube',
          })
          summary.measured += 1
        } catch (err) {
          summary.errors.push(err instanceof Error ? err.message : 'video islenemedi')
        }
      }
    } catch (err) {
      summary.errors.push(err instanceof Error ? err.message : 'video ayrintilari alinamadi')
    }
  }

  await markSynced(sql, account.id, describeYouTube(summary))
  return summary
}

/** Panelde gösterilen tek satırlık özet. */
export function describeYouTube(summary: SyncSummary): string {
  const base = `${summary.fetched} video · ${summary.matched} eşleşti · ${summary.measured} ölçüm`
  return summary.errors.length ? `${base} · hata: ${summary.errors[0]}` : base
}

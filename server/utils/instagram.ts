import type { NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'
import { CONTENT_TZ } from './contentTypes'
import { upsertMetric } from './contentStore'
import type { SyncSummary } from './socialTypes'
import {
  markSynced,
  updateAccountToken,
  upsertPost,
  type AccountWithToken,
} from './socialStore'
import { decryptToken, encryptToken } from './socialCrypto'

/**
 * Instagram otomatik ölçüm - "Instagram API with Instagram Login"
 * (graph.instagram.com). Kendi hesabımız için App Review GEREKMEZ: hesap Meta
 * uygulamasında tester/developer rolündeyse Standard Access yeter.
 *
 * Metrik webhook'u YOK; günlük cron ile POLL edilir. Meta 90 günden eskisini
 * vermediği için her tur bir anlık görüntü (`content_metrics`, source
 * 'instagram') yazar - geçmiş sonradan geri çekilemez.
 *
 * Metrik adları (v22.0 sonrası): views, reach, likes, comments, saved, shares,
 * total_interactions. `impressions` ve `video_views` KALDIRILDI, geri ekleme.
 *
 * Ağ çağrıları `deps.fetch` üzerinden yapılır: yerel doğrulama script'i canned
 * Graph yanıtlarıyla eşleştirme + DB yazma yolunu gerçek DB'ye karşı sürebilir.
 */

type Sql = NeonQueryFunction<false, false>

const API = 'https://graph.instagram.com'
const VERSION = 'v23.0'
const AUTHORIZE = 'https://www.instagram.com/oauth/authorize'
const TOKEN = 'https://api.instagram.com/oauth/access_token'
/** Token bitişine bu kadardan az kaldıysa cron yeniler (Meta 60 gün veriyor). */
const REFRESH_WINDOW_MS = 20 * 24 * 60 * 60 * 1000
/** Her turda bakılacak gönderi sayısı - eski gönderiler zaten ölçülmüş olur. */
const MEDIA_LIMIT = 25

// content_publish 24 Ağu 2026'da eklendi (story otomasyonu). Scope değişince
// mevcut token YENİ İZNİ KAZANMAZ: panelden bir kez yeniden bağlanmak gerekir.
export const IG_SCOPES =
  'instagram_business_basic,instagram_business_manage_insights,instagram_business_content_publish'

export type IgConfig = { appId: string; appSecret: string; redirectUri: string }

export type Deps = { fetch: typeof fetch }
const realDeps: Deps = { fetch: (...args) => fetch(...args) }

export function igConfig(event: H3Event): IgConfig | null {
  const c = useRuntimeConfig(event)
  const appId = String(c.igAppId ?? '').trim()
  const appSecret = String(c.igAppSecret ?? '').trim()
  const redirectUri = String(c.igRedirectUri ?? '').trim()
  return appId && appSecret && redirectUri ? { appId, appSecret, redirectUri } : null
}

export function requireIgConfig(event: H3Event): IgConfig {
  const config = igConfig(event)
  if (!config) throw createError({ statusCode: 503, statusMessage: 'instagram_yapilandirilmadi' })
  return config
}

/** Kullanıcıyı Instagram'ın izin ekranına götüren adres. */
export function authorizeUrl(config: IgConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: IG_SCOPES,
    state,
  })
  return `${AUTHORIZE}?${params.toString()}`
}

/** Graph hatalarını token sızdırmadan okunur mesaja çevir. */
async function readError(res: Response, where: string): Promise<string> {
  let detail = ''
  try {
    const body = (await res.json()) as { error?: { message?: string; type?: string; code?: number } }
    const e = body.error
    if (e) detail = `${e.type ?? 'hata'} ${e.code ?? ''} ${e.message ?? ''}`.trim()
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

async function postJson<T>(
  url: string,
  params: Record<string, string>,
  token: string,
  where: string,
  deps: Deps,
): Promise<T> {
  const res = await deps.fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  })
  if (!res.ok) throw new Error(await readError(res, where))
  return (await res.json()) as T
}

// ── OAuth ────────────────────────────────────────────────────────────────────
/** code → kısa ömürlü token (1 saat). */
export async function exchangeCode(config: IgConfig, code: string, deps: Deps = realDeps): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    code,
  })
  const res = await deps.fetch(TOKEN, { method: 'POST', body })
  if (!res.ok) throw new Error(await readError(res, 'token takasi'))
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error('token takasi: access_token yok')
  return json.access_token
}

/** Kısa ömürlü → uzun ömürlü (60 gün). */
export async function exchangeLongLived(
  config: IgConfig,
  shortToken: string,
  deps: Deps = realDeps,
): Promise<{ token: string; expiresAt: string }> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: config.appSecret,
    access_token: shortToken,
  })
  const res = await deps.fetch(`${API}/access_token?${params.toString()}`)
  if (!res.ok) throw new Error(await readError(res, 'uzun omurlu token'))
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('uzun omurlu token: access_token yok')
  return { token: json.access_token, expiresAt: expiryFrom(json.expires_in) }
}

/** Uzun ömürlü token'ı 60 gün daha uzat (en az 24 saatlik olmalı). */
export async function refreshLongLived(
  token: string,
  deps: Deps = realDeps,
): Promise<{ token: string; expiresAt: string }> {
  const params = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token })
  const res = await deps.fetch(`${API}/refresh_access_token?${params.toString()}`)
  if (!res.ok) throw new Error(await readError(res, 'token yenileme'))
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('token yenileme: access_token yok')
  return { token: json.access_token, expiresAt: expiryFrom(json.expires_in) }
}

function expiryFrom(seconds: number | undefined): string {
  const ms = (seconds ?? 60 * 24 * 60 * 60) * 1000
  return new Date(Date.now() + ms).toISOString()
}

export async function fetchMe(token: string, deps: Deps = realDeps): Promise<{ userId: string; username: string }> {
  const json = await getJson<{ user_id?: string; id?: string; username?: string }>(
    `${API}/${VERSION}/me?fields=user_id,username`,
    token,
    'hesap bilgisi',
    deps,
  )
  const userId = json.user_id ?? json.id
  if (!userId) throw new Error('hesap bilgisi: user_id yok')
  return { userId: String(userId), username: json.username ?? '' }
}

export type IgMedia = {
  id: string
  caption?: string
  media_type?: string
  media_product_type?: string
  permalink?: string
  timestamp?: string
  thumbnail_url?: string
}

export async function fetchMedia(token: string, deps: Deps = realDeps): Promise<IgMedia[]> {
  const fields = 'id,caption,media_type,media_product_type,permalink,timestamp,thumbnail_url'
  const json = await getJson<{ data?: IgMedia[] }>(
    `${API}/${VERSION}/me/media?fields=${fields}&limit=${MEDIA_LIMIT}`,
    token,
    'gonderi listesi',
    deps,
  )
  return json.data ?? []
}

/** Biçime göre metrik seti; Meta desteklemeyen metrikte hata döndüğü için daraltarak tekrar dener. */
function metricsFor(productType: string | undefined): string[] {
  if ((productType ?? '').toUpperCase() === 'STORY') {
    return ['views,reach,replies,shares,total_interactions', 'views,reach']
  }
  return ['views,reach,likes,comments,saved,shares,total_interactions', 'views,reach']
}

export async function fetchInsights(
  token: string,
  media: IgMedia,
  deps: Deps = realDeps,
): Promise<Record<string, number>> {
  const attempts = metricsFor(media.media_product_type)
  let lastError: unknown = null
  for (const metric of attempts) {
    try {
      const json = await getJson<{ data?: { name: string; values?: { value?: number }[]; total_value?: { value?: number } }[] }>(
        `${API}/${VERSION}/${media.id}/insights?metric=${metric}`,
        token,
        'olcum',
        deps,
      )
      const out: Record<string, number> = {}
      for (const row of json.data ?? []) {
        const value = row.total_value?.value ?? row.values?.[0]?.value ?? 0
        out[row.name] = Number(value) || 0
      }
      return out
    } catch (err) {
      lastError = err
    }
  }
  throw lastError instanceof Error ? lastError : new Error('olcum alinamadi')
}

/** Bugünün İstanbul günü (YYYY-MM-DD) - anlık görüntünün tarihi. */
export function istanbulToday(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CONTENT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  return parts // en-CA → YYYY-MM-DD
}

/**
 * Gönderiyi takvim etkinliğiyle eşle: önce platform kimliği, sonra yayın URL'i
 * (permalink). Bulunamazsa null döner ve gönderi panelde "eşleşmemiş" kalır -
 * kullanıcı tek tıkla bağlar. Başlık/caption benzerliğine bakılmaz: yanlış
 * eşleşme, eşleşmemekten kötüdür.
 */
export async function matchItemId(sql: Sql, media: IgMedia): Promise<number | null> {
  const byId = await sql`SELECT id FROM content_items WHERE platform_post_id = ${media.id} LIMIT 1`
  if (byId.length) return Number((byId[0] as Record<string, unknown>).id)
  if (media.permalink) {
    const trimmed = media.permalink.replace(/\/$/, '')
    const byUrl = await sql`
      SELECT id FROM content_items
      WHERE published_url = ${media.permalink} OR published_url = ${trimmed} OR published_url = ${`${trimmed}/`}
      LIMIT 1
    `
    if (byUrl.length) return Number((byUrl[0] as Record<string, unknown>).id)
  }
  return null
}

/**
 * Bir hesabın tam senkronu: gerekiyorsa token yenile, gönderileri çek,
 * eşleştir, eşleşenlerin ölçümünü yaz. Tek gönderide hata tüm turu düşürmez.
 */
export async function syncAccount(
  event: H3Event,
  sql: Sql,
  account: AccountWithToken,
  deps: Deps = realDeps,
): Promise<SyncSummary> {
  const summary: SyncSummary = {
    platform: account.platform,
    handle: account.handle,
    fetched: 0,
    matched: 0,
    measured: 0,
    refreshed: false,
    errors: [],
  }

  let token = await decryptToken(event, account.encryptedToken)

  // 1) Token bitmeye yakınsa yenile (60 günlük pencere sessizce kapanmasın).
  const expiresIn = account.expiresAt ? new Date(account.expiresAt).getTime() - Date.now() : Infinity
  if (expiresIn < REFRESH_WINDOW_MS) {
    try {
      const refreshed = await refreshLongLived(token, deps)
      token = refreshed.token
      await updateAccountToken(sql, account.id, await encryptToken(event, token), refreshed.expiresAt)
      summary.refreshed = true
    } catch (err) {
      summary.errors.push(err instanceof Error ? err.message : 'token yenilenemedi')
    }
  }

  // 2) Gönderiler
  let media: IgMedia[] = []
  try {
    media = await fetchMedia(token, deps)
    summary.fetched = media.length
  } catch (err) {
    summary.errors.push(err instanceof Error ? err.message : 'gonderiler alinamadi')
    await markSynced(sql, account.id, describe(summary))
    return summary
  }

  const metricDate = istanbulToday()
  for (const item of media) {
    try {
      const itemId = await matchItemId(sql, item)
      await upsertPost(sql, {
        platform: account.platform,
        externalId: item.id,
        permalink: item.permalink ?? '',
        publishedAt: item.timestamp ? new Date(item.timestamp).toISOString() : null,
        mediaType: item.media_product_type ?? item.media_type ?? '',
        caption: (item.caption ?? '').slice(0, 2200),
        thumbnailUrl: item.thumbnail_url ?? null,
        itemId,
      })
      if (!itemId) continue
      summary.matched += 1

      // Etkinliğin platform kimliği boşsa doldur: sonraki turlarda eşleşme
      // permalink'e bakmadan tek sorguda olur.
      await sql`
        UPDATE content_items SET platform_post_id = ${item.id}, updated_at = now()
        WHERE id = ${itemId} AND (platform_post_id IS NULL OR platform_post_id = '')
      `

      const insights = await fetchInsights(token, item, deps)
      await upsertMetric(sql, {
        itemId,
        metricDate,
        views: insights.views ?? 0,
        likes: insights.likes ?? 0,
        comments: insights.comments ?? 0,
        shares: insights.shares ?? 0,
        saves: insights.saved ?? 0,
        clicks: 0,
        reach: insights.reach ?? 0,
        interactions: insights.total_interactions ?? 0,
        notes: '',
        source: 'instagram',
      })
      summary.measured += 1
    } catch (err) {
      summary.errors.push(err instanceof Error ? err.message : 'gonderi islenemedi')
    }
  }

  await markSynced(sql, account.id, describe(summary))
  return summary
}

/** Panelde gösterilen tek satırlık özet. */
export function describe(summary: SyncSummary): string {
  const base = `${summary.fetched} gönderi · ${summary.matched} eşleşti · ${summary.measured} ölçüm${summary.refreshed ? ' · token yenilendi' : ''}`
  return summary.errors.length ? `${base} · hata: ${summary.errors[0]}` : base
}

// ── Story yayınlama ─────────────────────────────────────────────────────────

/**
 * Story'yi Content Publishing API ile paylaşır: container aç (STORIES,
 * image_url) → FINISHED olana dek yokla → publish. Meta image_url'i kendi
 * tarayıcısıyla çeker, yani adres HERKESE AÇIK olmalı ve JPEG olmalı
 * (/story/<slug>.jpg tam bunun için var).
 *
 * API ile paylaşılan story'ye link sticker EKLENEMEZ (Meta interaktif
 * sticker'ları API'ye açmıyor); görseldeki CTA bu yüzden "profildeki
 * linkten oku" der. Hata mesajları token içermez.
 */
export async function publishStory(
  token: string,
  igUserId: string,
  imageUrl: string,
  deps: Deps = realDeps,
): Promise<string> {
  const container = await postJson<{ id?: string }>(
    `${API}/${VERSION}/${igUserId}/media`,
    { media_type: 'STORIES', image_url: imageUrl },
    token,
    'story container',
    deps,
  )
  if (!container.id) throw new Error('story container: id dönmedi')

  // Görsel container'ları çoğunlukla anında hazırdır; Meta yine de async
  // olabilir uyarısı verir. Kısa bir yoklama penceresi yeter: 8 tur × 1.5 sn,
  // webclient'ın 20 sn bütçesinin içinde kalır.
  for (let i = 0; i < 8; i++) {
    const st = await getJson<{ status_code?: string }>(
      `${API}/${VERSION}/${container.id}?fields=status_code`,
      token,
      'container durumu',
      deps,
    )
    if (st.status_code === 'FINISHED') break
    if (st.status_code === 'ERROR') throw new Error('story container: Meta ERROR durumu döndü')
    await new Promise((r) => setTimeout(r, 1500))
  }

  const published = await postJson<{ id?: string }>(
    `${API}/${VERSION}/${igUserId}/media_publish`,
    { creation_id: container.id },
    token,
    'story publish',
    deps,
  )
  if (!published.id) throw new Error('story publish: id dönmedi')
  return published.id
}

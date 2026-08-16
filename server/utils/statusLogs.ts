import type { H3Event } from 'h3'

/**
 * Kesinti anındaki Cloud Run hata loglarını okur. 503'ün GERÇEK sebebini
 * söyleyen tek kaynak budur: yanıt gövdesi "bağlanamadım" der, log neden
 * bağlanamadığını yazar.
 *
 * NEDEN WEB TARAFINDA, BACKEND'DE DEĞİL: logu okumaya en çok uygulama
 * sunucusu düştüğünde ihtiyaç var, yani tam da backend'e soramayacağımız
 * anda. Vercel'den Logging API'ye doğrudan gidince kesinti kendi teşhisini
 * engellemiyor.
 *
 * BAĞIMLILIK YOK: `gcsSign.ts`teki desenin aynısı, Web Crypto ile RS256 JWT
 * ve jwt-bearer takası. @google-cloud/logging tek bir sorgu için koca bir
 * bağımlılık ağacı getirirdi.
 *
 * Servis hesabı: `status-watch@afiet-co`. İKİ rol gerekiyor ve bu bir tuzak:
 * `roles/logging.viewer` tek başına yetmiyor, API "Permission denied for all
 * log views" ile 403 veriyor; okuma ayrıca `roles/logging.viewAccessor`
 * istiyor. Hesabın başka hiçbir yetkisi yok.
 *
 * Anahtar Secret Manager'da `app-status-log-key`, env'de NUXT_STATUS_LOG_KEY
 * (base64 ya da ham JSON). Anahtar yoksa bölüm sessizce boş kalır.
 */

const PROJE = 'afiet-co'
const SERVIS = 'app-api-prod'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/logging.read'

type ServiceAccount = { client_email: string; private_key: string }

let saCache: { raw: string; sa: ServiceAccount; key: CryptoKey | null } | null = null
let tokenCache: { token: string; expiresAt: number } | null = null

function base64ToBuffer(value: string): ArrayBuffer {
  const binary = atob(value)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return buffer
}

function base64Url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function serviceAccount(event: H3Event): ServiceAccount | null {
  const raw = String(useRuntimeConfig(event).statusLogKey ?? '').trim()
  if (!raw) return null
  if (saCache && saCache.raw === raw) return saCache.sa
  try {
    const json = raw.startsWith('{') ? raw : new TextDecoder().decode(base64ToBuffer(raw))
    const parsed = JSON.parse(json) as Partial<ServiceAccount>
    if (!parsed.client_email || !parsed.private_key) throw new Error('client_email/private_key yok')
    const sa = { client_email: parsed.client_email, private_key: parsed.private_key }
    saCache = { raw, sa, key: null }
    return sa
  } catch (err) {
    console.error('[durum] NUXT_STATUS_LOG_KEY okunamadı:', err instanceof Error ? err.message : err)
    return null
  }
}

async function signingKey(sa: ServiceAccount): Promise<CryptoKey> {
  if (saCache && saCache.sa === sa && saCache.key) return saCache.key
  const body = sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')
  const key = await crypto.subtle.importKey(
    'pkcs8',
    base64ToBuffer(body),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  if (saCache && saCache.sa === sa) saCache.key = key
  return key
}

/** Servis hesabı JWT'sini erişim jetonuna çevirir; jeton süresi bitene dek saklanır. */
async function accessToken(sa: ServiceAccount): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token

  const now = Math.floor(Date.now() / 1000)
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64Url(JSON.stringify(claims))}`
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    await signingKey(sa),
    new TextEncoder().encode(unsigned),
  )
  const assertion = `${unsigned}.${base64Url(signature)}`

  // Düz `fetch`: bu iki çağrı Nitro'nun kendi rotalarıyla ilgisiz dış
  // uçlardır ve `$fetch`in rota tipi çıkarımı burada derleyiciyi kilitliyor
  // (TS2321, "excessive stack depth").
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  })
  const body = (await res.json()) as { access_token?: string; expires_in?: number }

  if (!body.access_token) throw new Error('erişim jetonu alınamadı')
  tokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  }
  return body.access_token
}

interface LogEntry {
  timestamp?: string
  severity?: string
  textPayload?: string
  jsonPayload?: Record<string, unknown>
  protoPayload?: { status?: { message?: string } }
  httpRequest?: {
    status?: number
    latency?: string
    requestMethod?: string
    requestUrl?: string
  }
}

/**
 * Bir log satırını maile yazılacak tek satıra indirger.
 *
 * Cloud Run'ın ERROR satırlarının çoğunda METİN YOKTUR: 503 dönen bir istek
 * yapılandırılmış `httpRequest` olarak düşer (16 Ağu'daki gerçek kayıt buydu).
 * O yüzden istek özeti gövde kadar birinci sınıf bir kaynaktır; yoksa mail
 * "{}" gösterirdi.
 */
function satir(entry: LogEntry): string {
  const zaman = entry.timestamp
    ? new Intl.DateTimeFormat('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Europe/Istanbul',
      }).format(new Date(entry.timestamp))
    : ''

  const json = entry.jsonPayload ?? {}
  const metin =
    entry.textPayload ??
    (typeof json.message === 'string' ? json.message : undefined) ??
    (typeof json.msg === 'string' ? json.msg : undefined) ??
    (typeof json.hata === 'string' ? json.hata : undefined) ??
    entry.protoPayload?.status?.message

  const req = entry.httpRequest
  const istek = req?.requestUrl
    ? [
        req.requestMethod ?? 'GET',
        new URL(req.requestUrl).pathname,
        req.latency ? `(${req.latency})` : '',
      ]
        .filter(Boolean)
        .join(' ')
    : ''

  const durum = req?.status ? `[${req.status}] ` : ''
  const govde = [metin, istek].filter(Boolean).join(' · ')
  if (!govde) return ''
  return `${zaman} ${durum}${govde}`.replace(/\s+/g, ' ').trim().slice(0, 300)
}

/**
 * Son `dakika` dakikadaki ERROR ve üstü Cloud Run satırlarını döndürür.
 * Anahtar yoksa ya da okuma başarısızsa boş dizi: teşhis eksik kalır, uyarı
 * yine gider.
 */
export async function recentErrorLogs(event: H3Event, dakika = 15, adet = 5): Promise<string[]> {
  const sa = serviceAccount(event)
  if (!sa) return []
  try {
    const token = await accessToken(sa)
    const since = new Date(Date.now() - dakika * 60_000).toISOString()
    const filter = [
      'resource.type="cloud_run_revision"',
      `resource.labels.service_name="${SERVIS}"`,
      'severity>=ERROR',
      `timestamp>="${since}"`,
    ].join(' AND ')

    const res = await fetch('https://logging.googleapis.com/v2/entries:list', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceNames: [`projects/${PROJE}`],
        filter,
        orderBy: 'timestamp desc',
        pageSize: adet,
      }),
    })
    if (!res.ok) throw new Error(`Logging API ${res.status}`)
    const body = (await res.json()) as { entries?: LogEntry[] }

    return (body.entries ?? []).map(satir).filter(Boolean)
  } catch (err) {
    console.error('[durum] loglar okunamadı:', err instanceof Error ? err.message : err)
    return []
  }
}

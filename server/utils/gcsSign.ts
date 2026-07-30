import type { H3Event } from 'h3'

/**
 * Google Cloud Storage V4 imzalı URL üretici - BAĞIMLILIK YOK, Web Crypto ile.
 *
 * Neden elle: @google-cloud/storage tek bir imza için koca bir bağımlılık ağacı
 * getiriyor (repo bilinçli olarak yalın). Neden `node:crypto` değil: repoda
 * @types/node yok ve Web Crypto her Nitro preset'inde çalışır.
 *
 * İmza dışındaki işler de aynı primitive ile yapılır: sunucu HEAD/DELETE için
 * de kendine imza atar, böylece OAuth token takası hiç yok.
 *
 * Kova: gs://afiet-icerik (europe-west1, herkese açık erişim KAPALI). Servis
 * hesabı content-storage@afiet-co yalnız bu kovada objectAdmin'dir. Anahtar
 * Secret Manager'da `app-content-gcs-key`, env'e base64 olarak girer
 * (NUXT_GCS_SA_KEY); ham JSON da kabul edilir.
 */

const HOST = 'storage.googleapis.com'
const SCOPE_SUFFIX = 'auto/storage/goog4_request'

type ServiceAccount = { client_email: string; private_key: string }

export type SignOptions = {
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE'
  objectKey: string
  expiresSeconds: number
  /** PUT'ta zorunlu: istemci birebir bu Content-Type'ı göndermek zorundadır. */
  contentType?: string
  /** GET'te indirme adı vermek için: response-content-disposition. */
  downloadName?: string
}

/** Anahtar ve ondan türeyen CryptoKey aynı env değeri için tekrar kullanılır. */
let cache: { raw: string; sa: ServiceAccount; key: CryptoKey | null } | null = null

/** Env'e (server-side) erişim: @types/node olmadan process.env okumanın yolu. */
const processEnv = (): Record<string, string | undefined> =>
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

function base64ToBuffer(value: string): ArrayBuffer {
  const binary = atob(value)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return buffer
}

/** Env'deki anahtarı çözer (base64 ya da ham JSON). Yapılandırılmamışsa null. */
function serviceAccount(event: H3Event): ServiceAccount | null {
  const raw = String(useRuntimeConfig(event).gcsSaKey ?? '').trim()
  if (!raw) return null
  if (cache && cache.raw === raw) return cache.sa
  try {
    const json = raw.startsWith('{') ? raw : new TextDecoder().decode(base64ToBuffer(raw))
    const parsed = JSON.parse(json) as Partial<ServiceAccount>
    if (!parsed.client_email || !parsed.private_key) throw new Error('client_email/private_key yok')
    const sa = { client_email: parsed.client_email, private_key: parsed.private_key }
    cache = { raw, sa, key: null }
    return sa
  } catch (err) {
    // Anahtar bozuksa sessiz kalma: depolama kapalı görünür, sebebi log'da olur.
    console.error('[icerik] NUXT_GCS_SA_KEY okunamadı:', err instanceof Error ? err.message : err)
    return null
  }
}

export function bucketName(event: H3Event): string {
  return String(useRuntimeConfig(event).gcsBucket ?? '').trim()
}

/** Ek yükleme/indirme kullanılabilir mi (anahtar + kova adı var mı). */
export function storageReady(event: H3Event): boolean {
  return Boolean(bucketName(event) && serviceAccount(event))
}

/** Yazma uçları için: depolama kapalıysa 503. */
export function requireStorage(event: H3Event): { sa: ServiceAccount; bucket: string } {
  const sa = serviceAccount(event)
  const bucket = bucketName(event)
  if (!sa || !bucket) throw createError({ statusCode: 503, statusMessage: 'depolama_bagli_degil' })
  return { sa, bucket }
}

/**
 * Ortam öneki: nesneler ortamlar arası karışmasın diye prefix'lenir. Vercel'in
 * kendi değişkenlerinden türetilir, yani ayarlanacak yeni bir env yok.
 */
export function envPrefix(): string {
  const env = processEnv()
  if (env.VERCEL_ENV === 'production') return 'prod'
  if (env.VERCEL_ENV === 'preview') return env.VERCEL_GIT_COMMIT_REF === 'staging' ? 'staging' : 'dev'
  return 'dev'
}

/** PEM (PKCS#8) → imzalamaya hazır CryptoKey; env değişmedikçe önbellekte. */
async function signingKey(sa: ServiceAccount): Promise<CryptoKey> {
  if (cache && cache.sa === sa && cache.key) return cache.key
  const body = sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '')
  const key = await crypto.subtle.importKey(
    'pkcs8',
    base64ToBuffer(body),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  if (cache && cache.sa === sa) cache.key = key
  return key
}

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
}

/** RFC 3986: her yol parçası ayrı ayrı kaçırılır, '/' ayraç olarak kalır. */
function encodePath(objectKey: string): string {
  return objectKey
    .split('/')
    .map((part) =>
      encodeURIComponent(part).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`),
    )
    .join('/')
}

/**
 * V4 imzalı URL. İmza; metot, yol, sorgu ve imzalanan başlıkları kapsar - yani
 * bilet başka bir dosya ya da başka bir Content-Type için kullanılamaz.
 */
export async function signedUrl(sa: ServiceAccount, bucket: string, opts: SignOptions): Promise<string> {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '') // 20260730T090000Z
  const date = stamp.slice(0, 8)
  const credentialScope = `${date}/${SCOPE_SUFFIX}`

  const headers: Record<string, string> = { host: HOST }
  if (opts.contentType) headers['content-type'] = opts.contentType
  const signedHeaders = Object.keys(headers).sort()
  const canonicalHeaders = signedHeaders.map((h) => `${h}:${headers[h]}\n`).join('')

  const query: Record<string, string> = {
    'X-Goog-Algorithm': 'GOOG4-RSA-SHA256',
    'X-Goog-Credential': `${sa.client_email}/${credentialScope}`,
    'X-Goog-Date': stamp,
    'X-Goog-Expires': String(opts.expiresSeconds),
    'X-Goog-SignedHeaders': signedHeaders.join(';'),
  }
  if (opts.downloadName) {
    // Tarayıcı sekmede açmak yerine indirsin; ad ASCII'ye indirilir (başlık kuralı).
    const safe = opts.downloadName.replace(/["\\]/g, '').replace(/[^\u0020-\u007E]/g, '_')
    query['response-content-disposition'] = `attachment; filename="${safe}"`
  }
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k]!)}`)
    .join('&')

  const canonicalResource = `/${bucket}/${encodePath(opts.objectKey)}`
  const canonicalRequest = [
    opts.method,
    canonicalResource,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders.join(';'),
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = ['GOOG4-RSA-SHA256', stamp, credentialScope, await sha256Hex(canonicalRequest)].join('\n')
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    await signingKey(sa),
    new TextEncoder().encode(stringToSign),
  )

  return `https://${HOST}${canonicalResource}?${canonicalQuery}&X-Goog-Signature=${toHex(signature)}`
}

/** Yükleme bileti (PUT). Content-Type imzaya girer, istemci birebir göndermeli. */
export function signUpload(event: H3Event, objectKey: string, contentType: string, expiresSeconds = 900) {
  const { sa, bucket } = requireStorage(event)
  return signedUrl(sa, bucket, { method: 'PUT', objectKey, contentType, expiresSeconds })
}

/** İndirme bileti (GET). downloadName verilirse tarayıcı dosyayı indirir. */
export function signDownload(event: H3Event, objectKey: string, downloadName?: string, expiresSeconds = 900) {
  const { sa, bucket } = requireStorage(event)
  return signedUrl(sa, bucket, { method: 'GET', objectKey, expiresSeconds, downloadName })
}

/**
 * Nesne gerçekten kovaya düştü mü: imzalı HEAD ile boyut ve tür okunur.
 * Yükleme yarıda kaldıysa 404 döner ve ek "hazir" işaretlenmez.
 */
export async function headObject(
  event: H3Event,
  objectKey: string,
): Promise<{ exists: boolean; sizeBytes: number; contentType: string }> {
  const { sa, bucket } = requireStorage(event)
  const url = await signedUrl(sa, bucket, { method: 'HEAD', objectKey, expiresSeconds: 120 })
  const res = await fetch(url, { method: 'HEAD' })
  if (!res.ok) return { exists: false, sizeBytes: 0, contentType: '' }
  return {
    exists: true,
    sizeBytes: Number(res.headers.get('content-length') ?? 0),
    contentType: res.headers.get('content-type') ?? '',
  }
}

/** Nesneyi siler; yoksa da başarı sayılır (idempotent). */
export async function deleteObject(event: H3Event, objectKey: string): Promise<void> {
  const { sa, bucket } = requireStorage(event)
  const url = await signedUrl(sa, bucket, { method: 'DELETE', objectKey, expiresSeconds: 120 })
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) {
    console.error('[icerik] GCS nesnesi silinemedi:', objectKey, res.status, await res.text().catch(() => ''))
  }
}

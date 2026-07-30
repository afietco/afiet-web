import type { H3Event } from 'h3'

/**
 * "Afi'ye sor" bileti - kısa ömürlü, imzalı, tek oturumluk.
 *
 * Neden var: panel anonim, dolayısıyla kotayı asacak bir kullanıcı kimliği yok.
 * Bilet backend'e şunu kanıtlar: istek bizim sayfamızdan geldi (yalnız afiet-web
 * secret'ı biliyor), taze, bu ortama ait, ve oturum kimliğini SUNUCU seçti.
 * Son madde önemli: istemci kendi oturum kimliğini seçebilseydi başkasının
 * sohbetine yazabilirdi (mobil photo-chat'teki açığın aynısı).
 *
 * Neden sayfaya gömülmüyor: ana sayfa `isr: 60` ile önbelleklenir. Gömülü bir
 * bilet 60 saniye boyunca bütün ziyaretçilere aynı şekilde servis edilirdi;
 * yani herkese açık bir sabit olurdu ve hiçbir şey kanıtlamazdı.
 *
 * Biçim, backend'deki doğrulayıcıyla BİREBİR aynı olmak zorunda
 * (afiet-backend/internal/server/ask_ticket.go):
 *   base64url(json(payload)) + "." + base64url(HMAC-SHA256(secret, payload))
 *
 * node:crypto yerine Web Crypto: repo bilinçli olarak yalın ve @types/node
 * bağımlılığı yok; Web Crypto Nitro'da global ve her preset'te çalışır.
 */

const TTL_SECONDS = 10 * 60
const encoder = new TextEncoder()

async function hmac(secret: string | ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const raw = typeof secret === 'string' ? encoder.encode(secret) : new Uint8Array(secret)
  const key = await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', key, encoder.encode(data))
}

function base64url(buf: ArrayBuffer | string): string {
  const bytes = typeof buf === 'string' ? encoder.encode(buf) : new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function clientIp(event: H3Event): string {
  const fwd = getRequestHeader(event, 'x-forwarded-for') || ''
  const first = fwd.split(',')[0]?.trim()
  return first || getRequestHeader(event, 'x-real-ip') || ''
}

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event)
  const secret = String(cfg.askTicketSecret || '')
  const env = String(cfg.askEnv || '')

  // Yapılandırılmamışsa panel "çok yakında" moduna geçsin; beta başvuru
  // route'undaki 503 'soon' deseninin aynısı, çalışmayan form yayınlanmaz.
  if (!secret || !env) {
    setResponseStatus(event, 503)
    return { status: 'soon' }
  }

  // Bilet asla önbelleğe alınmamalı: her ziyaretçi kendi oturumunu alır.
  setResponseHeader(event, 'cache-control', 'no-store')

  // IP parmak izi: geri döndürülemez, ham adres hiçbir yere yazılmaz. Backend
  // bunu KAPI olarak kullanmaz (çift yığınlı istemcide Vercel ve Cloud Run
  // farklı adres aileleri görebilir), yalnız gözlem için taşınır. Tuz da
  // secret'tan türer, böylece dağıtılacak tek bir sır olur.
  const salt = await hmac(secret, 'afiet-ask-ip-salt')
  const iph = hex(await hmac(salt, clientIp(event))).slice(0, 32)

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sid: crypto.randomUUID(),
    iat: now,
    exp: now + TTL_SECONDS,
    aud: 'ask',
    env,
    iph,
  }

  const body = base64url(JSON.stringify(payload))
  const sig = base64url(await hmac(secret, body))

  return { ticket: `${body}.${sig}`, expiresAt: payload.exp }
})

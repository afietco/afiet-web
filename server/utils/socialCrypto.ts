import type { H3Event } from 'h3'

/**
 * Erişim token'ları veritabanında ŞİFRELİ durur (AES-256-GCM, Web Crypto).
 *
 * Neden: Instagram'ın uzun ömürlü token'ı 60 gün boyunca hesabı okuyabilir ve
 * Neon branch'i backend'le paylaşılıyor - bir dump ya da yanlış log token'ı
 * açığa çıkarmasın. Anahtar Secret Manager'da `app-social-token-key`
 * (NUXT_SOCIAL_TOKEN_KEY, base64 32 bayt). Anahtar yoksa hesap bağlama akışı
 * kapalıdır (503), yarım şifreleme yapılmaz.
 *
 * Biçim: base64(iv[12] || ciphertext) - tek alan, ayrı iv kolonu yok.
 */

let cache: { raw: string; key: CryptoKey } | null = null

function bytesFromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function base64FromBytes(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

export function tokenKeyConfigured(event: H3Event): boolean {
  return Boolean(String(useRuntimeConfig(event).socialTokenKey ?? '').trim())
}

async function tokenKey(event: H3Event): Promise<CryptoKey> {
  const raw = String(useRuntimeConfig(event).socialTokenKey ?? '').trim()
  if (!raw) throw createError({ statusCode: 503, statusMessage: 'token_anahtari_yok' })
  if (cache && cache.raw === raw) return cache.key
  const bytes = bytesFromBase64(raw)
  if (bytes.length !== 32) throw createError({ statusCode: 503, statusMessage: 'token_anahtari_gecersiz' })
  const key = await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
  cache = { raw, key }
  return key
}

export async function encryptToken(event: H3Event, plain: string): Promise<string> {
  const key = await tokenKey(event)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain)),
  )
  const out = new Uint8Array(iv.length + cipher.length)
  out.set(iv, 0)
  out.set(cipher, iv.length)
  return base64FromBytes(out)
}

export async function decryptToken(event: H3Event, stored: string): Promise<string> {
  const key = await tokenKey(event)
  const bytes = bytesFromBase64(stored)
  const iv = bytes.slice(0, 12)
  const cipher = bytes.slice(12)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return new TextDecoder().decode(plain)
}

/**
 * OAuth `state` imzası: callback'e dönen isteğin bizden çıktığını doğrular
 * (CSRF). Token anahtarıyla HMAC alınır, ayrı sır gerekmez.
 */
export async function signState(event: H3Event, payload: string): Promise<string> {
  const raw = String(useRuntimeConfig(event).socialTokenKey ?? '').trim()
  if (!raw) throw createError({ statusCode: 503, statusMessage: 'token_anahtari_yok' })
  const key = await crypto.subtle.importKey('raw', bytesFromBase64(raw), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)))
  return `${payload}.${base64FromBytes(mac).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}`
}

export async function verifyState(event: H3Event, state: string): Promise<string | null> {
  const dot = state.lastIndexOf('.')
  if (dot <= 0) return null
  const payload = state.slice(0, dot)
  const expected = await signState(event, payload)
  // Sabit zamanlı olması gerekmiyor: imza gizli değil, sır anahtarın kendisi.
  return expected === state ? payload : null
}

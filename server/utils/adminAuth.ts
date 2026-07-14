import type { H3Event } from 'h3'
import { createRemoteJWKSet, jwtVerify } from 'jose'

/**
 * Panel (afiet-admin) istekleri için kimlik doğrulama. Backend'in adminOnly
 * kuralının birebir aynısı: Stack/Neon Auth JWT'si JWKS + issuer + audience
 * ile doğrulanır; yetki = roles içinde 'admin' VEYA e-posta allowlist'te.
 *
 * Env (Vercel/yerel):
 *   NUXT_ADMIN_JWKS_URL   — backend'deki AUTH_JWKS_URL ile aynı değer
 *   NUXT_ADMIN_ISSUER     — AUTH_ISSUER
 *   NUXT_ADMIN_AUDIENCE   — AUTH_AUDIENCE
 *   NUXT_ADMIN_EMAILS     — virgüllü allowlist (backend ADMIN_EMAILS ile aynı)
 *   NUXT_ADMIN_DEV_TOKEN  — YALNIZ `nuxt dev`te çalışan bypass token'ı;
 *                           production build'de kod seviyesinde ölüdür.
 */

export type AdminUser = { id: string; email: string; roles: string[] }

type JwksCacheEntry = ReturnType<typeof createRemoteJWKSet>
const jwksCache = new Map<string, JwksCacheEntry>()

function jwks(url: string): JwksCacheEntry {
  let entry = jwksCache.get(url)
  if (!entry) {
    entry = createRemoteJWKSet(new URL(url))
    jwksCache.set(url, entry)
  }
  return entry
}

export async function requireAdmin(event: H3Event): Promise<AdminUser> {
  const cfg = useRuntimeConfig(event)
  const header = getHeader(event, 'authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'bearer_gerekli' })
  }

  // Geliştirme bypass'ı: yalnız `nuxt dev` + env'de token tanımlıyken.
  if (import.meta.dev && cfg.adminDevToken && token === cfg.adminDevToken) {
    return { id: 'dev', email: 'dev@localhost', roles: ['admin'] }
  }

  if (!cfg.adminJwksUrl || !cfg.adminIssuer || !cfg.adminAudience) {
    throw createError({ statusCode: 503, statusMessage: 'admin_auth_yapilandirilmadi' })
  }

  let payload: Record<string, unknown>
  try {
    const verified = await jwtVerify(token, jwks(cfg.adminJwksUrl), {
      issuer: cfg.adminIssuer.replace(/\/$/, ''),
      audience: cfg.adminAudience,
      algorithms: ['ES256', 'RS256'],
    })
    payload = verified.payload as Record<string, unknown>
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'gecersiz_token' })
  }

  const sub = typeof payload.sub === 'string' ? payload.sub : ''
  if (!sub) throw createError({ statusCode: 401, statusMessage: 'gecersiz_token' })

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  let roles: string[] = []
  if (Array.isArray(payload.roles)) {
    roles = payload.roles.filter((r): r is string => typeof r === 'string')
  } else if (typeof payload.role === 'string' && payload.role) {
    roles = [payload.role]
  }

  const isAdminRole = roles.some((r) => r.toLowerCase() === 'admin')
  const allowlist = String(cfg.adminEmails || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const isAllowlisted = email !== '' && allowlist.includes(email)

  if (!isAdminRole && !isAllowlisted) {
    throw createError({ statusCode: 403, statusMessage: 'admin_yetkisi_gerekli' })
  }
  return { id: sub, email, roles }
}

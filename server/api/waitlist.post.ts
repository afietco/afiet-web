import { neon } from '@neondatabase/serverless'

/**
 * Bekleme listesi kaydı. E-postaları backend'in kullandığı AYNI Neon Postgres'te
 * `waitlist` tablosuna yazar (uygulamanın Stack Auth'lu /v1 şemasından bağımsız,
 * public uç). Bağlantı yoksa "soon" döner — form çalışmayan hâlde yayınlanmaz.
 *
 * Env: NUXT_DATABASE_URL (Neon connection string). Yereldeyken .env'den okunur.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type WaitlistStatus = 'ok' | 'exists' | 'soon'

export default defineEventHandler(async (event): Promise<{ status: WaitlistStatus }> => {
  const body = await readBody(event).catch(() => ({}) as Record<string, unknown>)
  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase()
  const source = String(body?.source ?? 'landing').slice(0, 40)
  // Gizli honeypot alanı: gerçek kullanıcı doldurmaz, botlar doldurur.
  const honeypot = String(body?.company ?? '')

  // Bota sessizce başarı taklidi yap — sinyal verme, DB'ye yazma.
  if (honeypot) return { status: 'ok' }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw createError({ statusCode: 422, statusMessage: 'invalid_email' })
  }

  const url = useRuntimeConfig(event).databaseUrl
  if (!url) {
    // DB bağlı değil: UI "çok yakında" satırını gösterir.
    setResponseStatus(event, 503)
    return { status: 'soon' }
  }

  try {
    const sql = neon(url)
    // Landing'e ait tablo; backend golang-migrate şemasından ayrı, kendi kendini kurar.
    await sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        email text UNIQUE NOT NULL,
        source text NOT NULL DEFAULT 'landing',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `
    const rows = await sql`
      INSERT INTO waitlist (email, source)
      VALUES (${email}, ${source})
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `
    return { status: rows.length ? 'ok' : 'exists' }
  } catch (err) {
    console.error('[waitlist] kayıt başarısız:', err)
    throw createError({ statusCode: 500, statusMessage: 'db_error' })
  }
})

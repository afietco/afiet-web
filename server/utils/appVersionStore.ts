import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'
import {
  APP_VERSION_PLATFORMS,
  compareAppVersions,
  emptyAppVersionGate,
  normalizeVersion,
  type AppVersionGate,
  type AppVersionPlatform,
  type PlatformVersionGate,
} from '#shared/types/appVersion'

/**
 * Sürüm kapısı veri katmanı. SEO ve durum sayfasıyla AYNI Neon'da, kendi
 * kendini kuran tek bir tabloda yaşar (backend'in golang-migrate şemasından
 * bağımsız).
 *
 * Neden burada, backend'de değil: bu kolun gerekeceği gün büyük ihtimalle
 * kendi API'mizin bozulduğu gündür. afiet.co Vercel'de, API Cloud Run'da;
 * yani biri düşerken diğeri ayakta kalıyor. Uygulamanın çevrimdışı kontrolü
 * (features/status/serviceStatus.ts) de tam bu gerekçeyle buradan okuyor.
 *
 * Yazan uçlar `/api/admin/app-version`, okuyan uç `/api/app-version`.
 * DDL burada TEK kaynaktır.
 */

type Sql = NeonQueryFunction<false, false>

/** Panelin bir alanı boş bırakmasıyla "hiç ayarlanmamış" aynı şeydir. */
const MAX_MESSAGE_LENGTH = 200

function sqlClient(event: H3Event): Sql | null {
  const url = useRuntimeConfig(event).databaseUrl
  return url ? neon(url) : null
}

let ensured = false

async function ensureTable(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS app_version_gate (
      platform text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  ensured = true
}

function normalizeStoreUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (trimmed === '') return null
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'gecersiz_magaza_adresi' })
  }
  /* market: Play uygulamasını doğrudan açan Android şeması; onun dışında
     yalnız https. http bir güncelleme yönlendirmesi için fazla savunmasız. */
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'market:') {
    throw createError({ statusCode: 400, statusMessage: 'magaza_adresi_https_olmali' })
  }
  return trimmed
}

/**
 * Panelden gelen tek platformun ayarını temizler.
 *
 * Tek gerçek kural burada: minimum, en yeniden büyük olamaz. Olsaydı kapı
 * herkesi mağazada bulunmayan bir sürüme gönderirdi, yani kimse kurtulamazdı.
 */
export function sanitizePlatformGate(input: unknown): PlatformVersionGate {
  const raw = (input ?? {}) as Record<string, unknown>
  const latestVersion = normalizeVersion(raw.latestVersion)
  const minimumVersion = normalizeVersion(raw.minimumVersion)

  if (minimumVersion && latestVersion && compareAppVersions(minimumVersion, latestVersion) > 0) {
    throw createError({ statusCode: 400, statusMessage: 'minimum_en_yeniden_buyuk_olamaz' })
  }

  const message =
    typeof raw.message === 'string' && raw.message.trim() !== ''
      ? raw.message.trim().slice(0, MAX_MESSAGE_LENGTH)
      : null

  return { latestVersion, minimumVersion, storeUrl: normalizeStoreUrl(raw.storeUrl), message }
}

function parseStored(value: unknown): PlatformVersionGate {
  const raw = (value ?? {}) as Record<string, unknown>
  return {
    latestVersion: normalizeVersion(raw.latestVersion),
    minimumVersion: normalizeVersion(raw.minimumVersion),
    storeUrl: typeof raw.storeUrl === 'string' && raw.storeUrl ? raw.storeUrl : null,
    message: typeof raw.message === 'string' && raw.message ? raw.message : null,
  }
}

/**
 * İki platformun ayarını okur.
 *
 * DB yoksa, tablo boşsa ya da sorgu düşerse BOŞ kapı döner. Bu yön bilinçli:
 * bu ucun bilmediği bir şey yüzünden kimse uygulamadan kilitlenmemeli.
 */
export async function readAppVersionGate(event: H3Event): Promise<AppVersionGate> {
  const sql = sqlClient(event)
  if (!sql) return emptyAppVersionGate()

  try {
    await ensureTable(sql)
    const rows = (await sql`SELECT platform, value FROM app_version_gate`) as {
      platform: string
      value: unknown
    }[]
    const gate = emptyAppVersionGate()
    for (const row of rows) {
      if ((APP_VERSION_PLATFORMS as string[]).includes(row.platform)) {
        gate[row.platform as AppVersionPlatform] = parseStored(row.value)
      }
    }
    return gate
  } catch {
    return emptyAppVersionGate()
  }
}

/** Tek platformun ayarını yazar (upsert). */
export async function writePlatformGate(
  event: H3Event,
  platform: AppVersionPlatform,
  value: PlatformVersionGate,
): Promise<void> {
  const sql = sqlClient(event)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })
  await ensureTable(sql)
  await sql`
    INSERT INTO app_version_gate (platform, value, updated_at)
    VALUES (${platform}, ${JSON.stringify(value)}::jsonb, now())
    ON CONFLICT (platform) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `
}


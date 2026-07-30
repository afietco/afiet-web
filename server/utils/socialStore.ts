import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'
import type { Channel } from './contentTypes'
import type { AccountStatus, AdminSocialPayload, SocialAccount, SocialPost } from './socialTypes'
import { tokenKeyConfigured } from './socialCrypto'

/**
 * Bağlı hesaplar (`social_accounts`) ve platformdan çekilen gönderiler
 * (`social_posts`). contentStore deseni: kendi kendini kuran tablolar, eklemeli
 * ALTER'lar, DB yoksa 503.
 *
 * Token'lar ŞİFRELİ saklanır (socialCrypto); bu dosya şifreli metni taşır,
 * çözme işini çağıran yapar - böylece token yanlışlıkla payload'a sızmaz.
 */

type Sql = NeonQueryFunction<false, false>
type Row = Record<string, unknown>

let ensured = false

function sqlClient(event: H3Event): Sql | null {
  const url = useRuntimeConfig(event).databaseUrl
  return url ? neon(url) : null
}

export async function requireSocialDb(event: H3Event): Promise<Sql> {
  const sql = sqlClient(event)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })
  await ensureSocialTables(sql)
  return sql
}

export async function ensureSocialTables(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS social_accounts (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      platform text NOT NULL,
      handle text NOT NULL DEFAULT '',
      external_id text NOT NULL,
      access_token text NOT NULL,
      expires_at timestamptz,
      last_sync_at timestamptz,
      last_result text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (platform, external_id)
    )
  `
  await sql`
    ALTER TABLE social_accounts DROP CONSTRAINT IF EXISTS social_accounts_platform_check
  `
  await sql`
    ALTER TABLE social_accounts
      ADD CONSTRAINT social_accounts_platform_check
      CHECK (platform IN ('blog','instagram','x','tiktok','youtube'))
  `
  await sql`
    CREATE TABLE IF NOT EXISTS social_posts (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      platform text NOT NULL,
      external_id text NOT NULL,
      permalink text NOT NULL DEFAULT '',
      published_at timestamptz,
      media_type text NOT NULL DEFAULT '',
      caption text NOT NULL DEFAULT '',
      thumbnail_url text,
      item_id bigint REFERENCES content_items(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (platform, external_id)
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS social_posts_item_idx ON social_posts (item_id)`
  ensured = true
}

// ── Satır → tip ──────────────────────────────────────────────────────────────
const toIso = (v: unknown): string => {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(String(v))
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}
const toIsoOrNull = (v: unknown): string | null => (v ? toIso(v) || null : null)

/** Token bitişine 10 günden az kaldıysa "süresi doluyor", geçtiyse "kopuk". */
export function accountStatus(expiresAt: string | null): AccountStatus {
  if (!expiresAt) return 'bagli'
  const left = new Date(expiresAt).getTime() - Date.now()
  if (left <= 0) return 'kopuk'
  if (left < 10 * 24 * 60 * 60 * 1000) return 'suresi_doluyor'
  return 'bagli'
}

function mapAccount(r: Row): SocialAccount {
  const expiresAt = toIsoOrNull(r.expires_at)
  return {
    id: Number(r.id),
    platform: r.platform as Channel,
    handle: String(r.handle ?? ''),
    externalId: String(r.external_id),
    status: accountStatus(expiresAt),
    expiresAt,
    lastSyncAt: toIsoOrNull(r.last_sync_at),
    lastResult: String(r.last_result ?? ''),
    createdAt: toIso(r.created_at),
  }
}

function mapPost(r: Row): SocialPost {
  return {
    id: Number(r.id),
    platform: r.platform as Channel,
    externalId: String(r.external_id),
    permalink: String(r.permalink ?? ''),
    publishedAt: toIsoOrNull(r.published_at),
    mediaType: String(r.media_type ?? ''),
    caption: String(r.caption ?? ''),
    thumbnailUrl: (r.thumbnail_url as string | null) ?? null,
    itemId: r.item_id === null || r.item_id === undefined ? null : Number(r.item_id),
    createdAt: toIso(r.created_at),
  }
}

/** Şifreli token dahil tam satır - yalnız sunucu içi kullanım (cron/callback). */
export type AccountWithToken = SocialAccount & { encryptedToken: string }

export async function listAccounts(sql: Sql): Promise<SocialAccount[]> {
  const rows = await sql`SELECT * FROM social_accounts ORDER BY platform`
  return rows.map(mapAccount)
}

export async function listAccountsWithTokens(sql: Sql): Promise<AccountWithToken[]> {
  const rows = await sql`SELECT * FROM social_accounts ORDER BY platform`
  return rows.map((r) => ({ ...mapAccount(r as Row), encryptedToken: String((r as Row).access_token) }))
}

/** Hesabı ekler ya da (platform, external_id) üzerine yazar - yeniden bağlama. */
export async function upsertAccount(
  sql: Sql,
  input: { platform: Channel; handle: string; externalId: string; encryptedToken: string; expiresAt: string | null },
): Promise<void> {
  await sql`
    INSERT INTO social_accounts (platform, handle, external_id, access_token, expires_at)
    VALUES (${input.platform}, ${input.handle}, ${input.externalId}, ${input.encryptedToken}, ${input.expiresAt}::timestamptz)
    ON CONFLICT (platform, external_id) DO UPDATE SET
      handle = EXCLUDED.handle,
      access_token = EXCLUDED.access_token,
      expires_at = EXCLUDED.expires_at,
      last_result = '',
      updated_at = now()
  `
}

export async function updateAccountToken(
  sql: Sql,
  id: number,
  encryptedToken: string,
  expiresAt: string | null,
): Promise<void> {
  await sql`
    UPDATE social_accounts
    SET access_token = ${encryptedToken}, expires_at = ${expiresAt}::timestamptz, updated_at = now()
    WHERE id = ${id}
  `
}

export async function markSynced(sql: Sql, id: number, result: string): Promise<void> {
  await sql`
    UPDATE social_accounts
    SET last_sync_at = now(), last_result = ${result.slice(0, 500)}, updated_at = now()
    WHERE id = ${id}
  `
}

export async function deleteAccount(sql: Sql, id: number): Promise<void> {
  await sql`DELETE FROM social_accounts WHERE id = ${id}`
}

// ── Gönderiler ───────────────────────────────────────────────────────────────
export async function listPosts(sql: Sql): Promise<SocialPost[]> {
  const rows = await sql`SELECT * FROM social_posts ORDER BY published_at DESC NULLS LAST, id DESC`
  return rows.map(mapPost)
}

/**
 * Gönderiyi ekler/günceller. `item_id` KORUNUR: elle ya da otomatik kurulmuş
 * eşleşme yeni senkronda silinmesin.
 */
export async function upsertPost(
  sql: Sql,
  input: {
    platform: Channel
    externalId: string
    permalink: string
    publishedAt: string | null
    mediaType: string
    caption: string
    thumbnailUrl: string | null
    itemId: number | null
  },
): Promise<void> {
  await sql`
    INSERT INTO social_posts (platform, external_id, permalink, published_at, media_type, caption, thumbnail_url, item_id)
    VALUES (${input.platform}, ${input.externalId}, ${input.permalink}, ${input.publishedAt}::timestamptz,
            ${input.mediaType}, ${input.caption}, ${input.thumbnailUrl}, ${input.itemId})
    ON CONFLICT (platform, external_id) DO UPDATE SET
      permalink = EXCLUDED.permalink,
      published_at = EXCLUDED.published_at,
      media_type = EXCLUDED.media_type,
      caption = EXCLUDED.caption,
      thumbnail_url = EXCLUDED.thumbnail_url,
      item_id = COALESCE(social_posts.item_id, EXCLUDED.item_id),
      updated_at = now()
  `
}

/** Gönderiyi etkinliğe bağlar (ya da itemId null ile bağı koparır). */
export async function linkPost(sql: Sql, postId: number, itemId: number | null): Promise<void> {
  const rows = await sql`
    UPDATE social_posts SET item_id = ${itemId}, updated_at = now() WHERE id = ${postId} RETURNING platform, external_id
  `
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'gonderi_bulunamadi' })
  const row = rows[0] as Row
  // Etkinliğin platform kimliğini de tut: ölçüm çekimi buradan hızlanır ve
  // panelde "hangi gönderi" sorusu tek bakışta cevaplanır.
  if (itemId) {
    await sql`UPDATE content_items SET platform_post_id = ${String(row.external_id)}, updated_at = now() WHERE id = ${itemId}`
  }
}

/** Panelin ihtiyacı: hesaplar + eşleşmemiş gönderiler. */
export async function buildSocialAdminPayload(event: H3Event): Promise<AdminSocialPayload> {
  const config = useRuntimeConfig(event)
  const instagramReady = Boolean(
    String(config.igAppId ?? '').trim() && String(config.igAppSecret ?? '').trim() && tokenKeyConfigured(event),
  )
  const connectHost = String(config.igRedirectUri ?? '').trim()
  const sql = sqlClient(event)
  if (!sql) return { dbConnected: false, live: true, instagramReady, connectHost, accounts: [], unmatched: [] }
  try {
    await ensureSocialTables(sql)
    const [accounts, posts] = await Promise.all([listAccounts(sql), listPosts(sql)])
    return {
      dbConnected: true,
      live: true,
      instagramReady,
      connectHost,
      accounts,
      unmatched: posts.filter((p) => p.itemId === null),
    }
  } catch (err) {
    console.error('[sosyal] payload okunamadı:', err)
    return { dbConnected: false, live: true, instagramReady, connectHost, accounts: [], unmatched: [] }
  }
}

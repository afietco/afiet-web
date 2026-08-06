import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'

/**
 * Bülten abone katmanı. Aboneler SEO/analitik/beta ile AYNI Neon'da, kendi
 * kendini kuran `bulten_subscribers` tablosunda yaşar; DDL burada TEK
 * kaynaktır (betaStore deseninin aynısı).
 *
 * Akış çift onaydır: form `beklemede` kayıt açar ve onay maili gider; abonelik
 * ancak /bulten/onay?token= ile `onayli` olur. `token` hem onay hem çıkış
 * bağlantısında kullanılır ve e-postayı bilen birinin başkasını abone
 * edememesinin güvencesi onaydır, token gizliliği değil.
 *
 * Gönderim dış servissizdir: `scripts/bulten-gonder.mjs` onaylı aboneleri bu
 * tablodan okur, Resend API ile yollar (Audience/Broadcast paneli KULLANILMAZ,
 * kullanıcı kararı 5 Ağu 2026).
 */
type Sql = NeonQueryFunction<false, false>

export function bultenSql(event: H3Event): Sql | null {
  const url = useRuntimeConfig(event).databaseUrl
  return url ? neon(url) : null
}

let ensured = false
export async function ensureBultenTable(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS bulten_subscribers (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      email text UNIQUE NOT NULL,
      status text NOT NULL DEFAULT 'beklemede'
        CHECK (status IN ('beklemede', 'onayli', 'cikti')),
      token text UNIQUE NOT NULL,
      source text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      confirmed_at timestamptz,
      unsubscribed_at timestamptz
    )
  `
  // Tablo prod'da veriyle yaşıyor; yeni kolon eklemeli ALTER ile gelir
  // (contentStore deseninin aynısı). lang: abonenin dili - İngilizce duyuru
  // yalnız 'en' kesimine gider, gönderim script'i bu kolonu okur.
  await sql`
    ALTER TABLE bulten_subscribers
    ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'tr'
  `
  ensured = true
}

/**
 * Kayıt açar ya da tazeler. Yeniden abone olan `cikti` satırı `beklemede`ye
 * döner ve YENİ token alır (eski çıkış bağlantıları ölür); zaten `onayli`
 * olan dokunulmadan bırakılır ki onay maili yeniden gitmesin.
 * Dil son başvurunun dilidir: TR'den abone olup sonra /en'den yazan kişi
 * İngilizce listeye geçer (kendi tercihinin en tazesi kazanır).
 */
export async function upsertSubscriber(
  sql: Sql,
  email: string,
  source: string,
  lang: 'tr' | 'en' = 'tr',
): Promise<{ status: string; token: string; isNew: boolean }> {
  await ensureBultenTable(sql)
  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '')

  const rows = await sql`
    INSERT INTO bulten_subscribers (email, token, source, lang)
    VALUES (${email}, ${token}, ${source}, ${lang})
    ON CONFLICT (email) DO UPDATE SET
      status = CASE WHEN bulten_subscribers.status = 'onayli'
                    THEN 'onayli' ELSE 'beklemede' END,
      token = CASE WHEN bulten_subscribers.status = 'onayli'
                   THEN bulten_subscribers.token ELSE EXCLUDED.token END,
      source = EXCLUDED.source,
      lang = EXCLUDED.lang
    RETURNING status, token, (created_at = now()) AS is_new
  `
  const r = rows[0]!
  return { status: String(r.status), token: String(r.token), isNew: r.is_new === true }
}

export async function confirmByToken(sql: Sql, token: string): Promise<boolean> {
  await ensureBultenTable(sql)
  const rows = await sql`
    UPDATE bulten_subscribers
    SET status = 'onayli', confirmed_at = COALESCE(confirmed_at, now())
    WHERE token = ${token} AND status <> 'cikti'
    RETURNING id
  `
  return rows.length > 0
}

export async function unsubscribeByToken(sql: Sql, token: string): Promise<boolean> {
  await ensureBultenTable(sql)
  const rows = await sql`
    UPDATE bulten_subscribers
    SET status = 'cikti', unsubscribed_at = now()
    WHERE token = ${token}
    RETURNING id
  `
  return rows.length > 0
}

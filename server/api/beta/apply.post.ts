import { betaSql, ensureBetaTable } from '~~/server/utils/betaStore'

/**
 * Beta başvurusu. Zengin başvuruyu backend'in AYNI Neon Postgres'inde
 * `beta_applications` tablosuna yazar (waitlist gibi kendi kendini kurar, public uç,
 * uygulamanın /v1 şemasından bağımsız). Bağlantı yoksa "soon" döner. Tablo DDL'i
 * `server/utils/betaStore.ts`te TEK kaynaktır. Okuma: `GET /api/admin/beta`.
 *
 * Zorunlu: geçerli e-posta + açık rıza (consent). Gerisi isteğe bağlı.
 * Sayı/kilo/kalori toplamayız — marka gereği. Env: NUXT_DATABASE_URL.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type BetaStatus = 'ok' | 'exists' | 'soon'

// Serbest metni sınırla ve kırp.
function str(v: unknown, max: number): string {
  return String(v ?? '')
    .trim()
    .slice(0, max)
}

// String dizisini temizle: yalnız stringler, boşları at, sayı/uzunluk sınırı.
function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 24)
    .map((x) => x.slice(0, 48))
}

export default defineEventHandler(async (event): Promise<{ status: BetaStatus }> => {
  const body = await readBody(event).catch(() => ({}) as Record<string, unknown>)

  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase()
  const source = str(body?.source ?? 'beta', 40) || 'beta'
  // Gizli honeypot alanı: gerçek kullanıcı doldurmaz, botlar doldurur.
  const honeypot = String(body?.company ?? '')

  // Bota sessizce başarı taklidi yap — sinyal verme, DB'ye yazma.
  if (honeypot) return { status: 'ok' }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw createError({ statusCode: 422, statusMessage: 'invalid_email' })
  }

  // KVKK: açık rıza zorunlu. İşaretlenmeden başvuru kaydedilmez.
  const consent = body?.consent === true
  if (!consent) {
    throw createError({ statusCode: 422, statusMessage: 'consent_required' })
  }

  const platformRaw = str(body?.platform, 20)
  const platform = platformRaw === 'ios' || platformRaw === 'android' ? platformRaw : ''
  const goals = strArray(body?.goals)
  const countingFeeling = str(body?.countingFeeling, 40)
  const appsNutrition = strArray(body?.appsNutrition)
  const appsActivity = strArray(body?.appsActivity)
  const appsBody = strArray(body?.appsBody)
  const appsOther = str(body?.appsOther, 200)
  const contactChannel = str(body?.contactChannel, 40)
  const heardFrom = str(body?.heardFrom, 40)
  const userAgent = str(getRequestHeader(event, 'user-agent'), 400)

  const sql = betaSql(event)
  if (!sql) {
    // DB bağlı değil: UI "çok yakında" satırını gösterir.
    setResponseStatus(event, 503)
    return { status: 'soon' }
  }

  try {
    // Landing'e ait tablo; backend golang-migrate şemasından ayrı, kendi kendini kurar.
    await ensureBetaTable(sql)
    // Aynı e-posta yeniden başvurursa yanıtları güncelle (xmax=0 → yeni satır mı?).
    const rows = await sql`
      INSERT INTO beta_applications (
        email, platform, goals, counting_feeling,
        apps_nutrition, apps_activity, apps_body, apps_other,
        contact_channel, heard_from, consent, consent_at, user_agent, source
      ) VALUES (
        ${email}, ${platform}, ${JSON.stringify(goals)}::jsonb, ${countingFeeling},
        ${JSON.stringify(appsNutrition)}::jsonb, ${JSON.stringify(appsActivity)}::jsonb,
        ${JSON.stringify(appsBody)}::jsonb, ${appsOther},
        ${contactChannel}, ${heardFrom}, ${consent}, now(), ${userAgent}, ${source}
      )
      ON CONFLICT (email) DO UPDATE SET
        platform = EXCLUDED.platform,
        goals = EXCLUDED.goals,
        counting_feeling = EXCLUDED.counting_feeling,
        apps_nutrition = EXCLUDED.apps_nutrition,
        apps_activity = EXCLUDED.apps_activity,
        apps_body = EXCLUDED.apps_body,
        apps_other = EXCLUDED.apps_other,
        contact_channel = EXCLUDED.contact_channel,
        heard_from = EXCLUDED.heard_from,
        consent = EXCLUDED.consent,
        consent_at = EXCLUDED.consent_at,
        user_agent = EXCLUDED.user_agent,
        updated_at = now()
      RETURNING (xmax = 0) AS inserted
    `
    const inserted = rows[0]?.inserted === true || rows[0]?.inserted === 't'
    return { status: inserted ? 'ok' : 'exists' }
  } catch (err) {
    console.error('[beta] başvuru başarısız:', err)
    throw createError({ statusCode: 500, statusMessage: 'db_error' })
  }
})

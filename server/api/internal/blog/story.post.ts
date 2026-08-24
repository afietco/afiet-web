import { requireInternalSecret } from '~~/server/utils/internalAuth'
import { requireContentDb, invalidateContentCache } from '~~/server/utils/contentStore'
import { parseStoryPayload } from '~~/server/utils/storyPayload'

/**
 * Yayındaki yazıya story payload'ını iliştirir (Go backend çağırır,
 * X-Internal-Secret ile).
 *
 * Publish ucundan AYRI olması tasarım gereği: story yazının onayından sonra
 * kendi denetim kapısından geçer ve yayını asla bloklamaz. Yani payload
 * yayın anında hazır olabilir de olmayabilir de; her iki durumda da tek yol
 * budur (yayın → iliştir), publish gövdesine ikinci bir story yolu açmak
 * aynı verinin iki rotada yaşaması demek olurdu.
 *
 * Üzerine yazmaya İZİN VAR (publish'in 409'unun aksine): denetçinin revize
 * turundan çıkan yeni payload eskisinin düzeltmesidir, elle yayının
 * güncellemesi değil.
 */

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export default defineEventHandler(async (event) => {
  requireInternalSecret(event)
  const body = await readBody<{ slug?: string; story?: unknown }>(event)

  const slug = String(body?.slug ?? '').trim()
  if (!SLUG_RE.test(slug)) {
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_slug' })
  }
  const story = parseStoryPayload(body?.story)
  if (!story) {
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_story' })
  }

  const sql = await requireContentDb(event)
  const rows = await sql`
    UPDATE blog_posts
    SET story = ${JSON.stringify(story)}::jsonb, updated_at = now()
    WHERE slug = ${slug} AND status = 'yayinda'
    RETURNING slug
  `
  if (rows.length === 0) {
    // Yayında olmayan yazıya story iliştirilmez: rota yalnız yayındaki
    // yazıdan çizer, taslağa yazılan payload sessizce kaybolurdu.
    throw createError({ statusCode: 404, statusMessage: 'yazi_yayinda_degil' })
  }

  invalidateContentCache()
  return { ok: true, storyPath: `/story/${slug}.png` }
})

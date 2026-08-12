import { requireContentDb, invalidateContentCache } from '~~/server/utils/contentStore'
import { requireInternalSecret } from '~~/server/utils/internalAuth'

/**
 * İçerik hattının yayın ucu (Go backend çağırır, X-Internal-Secret ile).
 * scripts/publish-post.mjs ile AYNI sözleşme: aynı doğrulamalar, aynı upsert
 * alanları, aynı content_items güncellemesi. İki fark bilinçli:
 *   - Mevcut slug'ın ÜZERİNE YAZMAZ (409): hat yayınlanmış yazıyı güncellemez,
 *     elle güncelleme publish-post.mjs'in işi olarak kalır.
 *   - Onay sorusu yok: insan onayı maildeki "ok" ile zaten verildi.
 */

import { blogPath } from '#shared/utils/locales'

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SITE_FALLBACK = 'https://afiet.co'

/**
 * Yayınlanan yazının adresi, isteğin GELDİĞİ origin'den kurulur; sabit
 * afiet.co DEĞİL. Production'da ikisi zaten aynı (backend oraya afiet.co ile
 * gelir), ama preview'da sabit adres yalanlıyordu: dev'de yayınlanan yazı
 * "https://afiet.co/blog/..." diye raporlanıyor, o adres 404 veriyor ve aynı
 * adres türevlerin canonical'ına yazılıyordu. Medium'a canonical olarak var
 * olmayan bir sayfa vermek, yanlış bir adres vermekten daha kötüdür.
 */
function siteOrigin(event: Parameters<typeof getRequestURL>[0]): string {
  try {
    const origin = getRequestURL(event).origin
    return origin && origin.startsWith('http') ? origin : SITE_FALLBACK
  } catch {
    return SITE_FALLBACK
  }
}

const readingMinutes = (src: string) =>
  Math.max(1, Math.round(src.trim().split(/\s+/).filter(Boolean).length / 200))

export default defineEventHandler(async (event) => {
  requireInternalSecret(event)
  const body = await readBody<{
    slug?: string
    title?: string
    description?: string
    contentMd?: string
    tags?: string[]
    coverUrl?: string
    itemId?: number
    lang?: string
    translationOf?: string
  }>(event)

  const slug = String(body?.slug ?? '').trim()
  const title = String(body?.title ?? '').trim()
  const description = String(body?.description ?? '').trim()
  const contentMd = String(body?.contentMd ?? '').trim()
  const tags = Array.isArray(body?.tags)
    ? body.tags.filter((t): t is string => typeof t === 'string' && t.trim() !== '')
    : []
  const coverUrl = typeof body?.coverUrl === 'string' && body.coverUrl.trim() !== '' ? body.coverUrl.trim() : null
  const itemId = typeof body?.itemId === 'number' && Number.isInteger(body.itemId) ? body.itemId : null
  // Dil verilmezse Türkçe (hattın bugünkü davranışı). Tanınmayan bir değer
  // sessizce Türkçeye düşmez, açıkça reddedilir: yanlış dile düşen bir yazı
  // yanlış listede görünür ve bunu kimse fark etmez.
  const rawLang = body?.lang === undefined ? 'tr' : String(body.lang)
  if (rawLang !== 'tr' && rawLang !== 'en')
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:lang' })
  const lang = rawLang
  const translationOf =
    typeof body?.translationOf === 'string' && body.translationOf.trim() !== ''
      ? body.translationOf.trim()
      : null

  if (!SLUG_RE.test(slug) || slug.length > 120)
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:slug' })
  if (translationOf && !SLUG_RE.test(translationOf))
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:translationOf' })
  if (!title || title.length > 300)
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:title' })
  if (!description) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:description' })
  if (!contentMd) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:contentMd' })

  const sql = await requireContentDb(event)

  const existing = await sql`SELECT slug FROM blog_posts WHERE slug = ${slug}`
  if (existing.length) throw createError({ statusCode: 409, statusMessage: 'slug_zaten_var' })

  const minutes = readingMinutes(contentMd)
  await sql`
    INSERT INTO blog_posts
      (slug, title, description, content_md, tags, cover_url, status, reading_minutes, item_id,
       published_at, lang, translation_of)
    VALUES
      (${slug}, ${title}, ${description}, ${contentMd}, ${JSON.stringify(tags)}::jsonb,
       ${coverUrl}, 'yayinda', ${minutes}, ${itemId}, now(), ${lang}, ${translationOf})
  `

  const url = `${siteOrigin(event)}${blogPath(lang, slug)}`
  if (itemId) {
    await sql`
      UPDATE content_items SET
        status = 'yayinda',
        published_url = ${url},
        slug = ${slug},
        updated_at = now()
      WHERE id = ${itemId}
    `
  }

  invalidateContentCache()
  return { ok: true, url, readingMinutes: minutes }
})

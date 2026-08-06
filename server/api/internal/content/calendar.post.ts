import { requireContentDb } from '~~/server/utils/contentStore'
import { CONTENT_TZ, emptyBrief } from '~~/server/utils/contentTypes'
import { requireInternalSecret } from '~~/server/utils/internalAuth'

/**
 * İçerik hattının takvim aynası (Go backend çağırır, X-Internal-Secret ile).
 * Strateji önerileri panele "fikir" olarak düşer, onayda "uretimde"ye,
 * yayında "yayinda"ya ilerler; revizyonda eski öneriler silinip yenileri
 * yazılır. Tek uç, üç eylem: create | status | delete.
 *
 * Panelin kendi uçlarına (admin/content) DOKUNMAZ; buradan yalnız hattın
 * sahibi olduğu satırlar yönetilir (backend id listesini kendinde tutar).
 */

type CreateItem = { title?: string; targetQuery?: string; rationale?: string; plannedAt?: string }

const ALLOWED_STATUS = new Set(['fikir', 'planlandi', 'uretimde', 'yayinda', 'arsiv'])

export default defineEventHandler(async (event) => {
  requireInternalSecret(event)
  const body = await readBody<{
    action?: string
    items?: CreateItem[]
    id?: number
    status?: string
    ids?: number[]
  }>(event)

  const sql = await requireContentDb(event)

  switch (body?.action) {
    case 'create': {
      const items = Array.isArray(body.items) ? body.items : []
      if (!items.length) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:items' })
      const ids: number[] = []
      for (const item of items) {
        const title = String(item?.title ?? '').trim()
        if (!title) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:title' })
        const plannedAt = String(item?.plannedAt ?? '').trim() || null
        if (plannedAt && Number.isNaN(new Date(plannedAt).getTime()))
          throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:plannedAt' })
        const brief = {
          ...emptyBrief(),
          keywords: item?.targetQuery ? [String(item.targetQuery)] : [],
          notes: String(item?.rationale ?? ''),
        }
        const rows = await sql`
          INSERT INTO content_items (channel, format, title, status, brief, planned_at, all_day, planned_date)
          VALUES (
            'blog', 'yazi', ${title}, 'fikir', ${JSON.stringify(brief)}::jsonb,
            ${plannedAt}::timestamptz, false,
            CASE WHEN ${plannedAt}::timestamptz IS NULL THEN NULL
                 ELSE ((${plannedAt}::timestamptz) AT TIME ZONE ${CONTENT_TZ})::date END
          )
          RETURNING id
        `
        ids.push(Number((rows[0] as { id: unknown }).id))
      }
      return { ok: true, ids }
    }

    case 'status': {
      const id = Number(body.id)
      const status = String(body.status ?? '')
      if (!Number.isInteger(id) || id <= 0)
        throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:id' })
      if (!ALLOWED_STATUS.has(status))
        throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:status' })
      const rows = await sql`
        UPDATE content_items SET status = ${status}, updated_at = now()
        WHERE id = ${id} RETURNING id
      `
      if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'icerik_bulunamadi' })
      return { ok: true }
    }

    case 'delete': {
      const ids = (Array.isArray(body.ids) ? body.ids : [])
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
      if (!ids.length) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:ids' })
      // Hat yalnız kendi "fikir" satırlarını siler: kullanıcı öneriyi elle
      // ilerletmişse (planlandi/uretimde...) satır artık panelin malıdır.
      for (const id of ids) {
        await sql`DELETE FROM content_items WHERE id = ${id} AND status = 'fikir'`
      }
      return { ok: true }
    }

    default:
      throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:action' })
  }
})

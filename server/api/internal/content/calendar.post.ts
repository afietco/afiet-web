import { requireContentDb } from '~~/server/utils/contentStore'
import { CONTENT_TZ, emptyBrief } from '~~/server/utils/contentTypes'
import { requireInternalSecret } from '~~/server/utils/internalAuth'

/**
 * İçerik hattının takvim aynası (Go backend çağırır, X-Internal-Secret ile).
 * Strateji önerileri panele "fikir" olarak düşer, onayda "uretimde"ye, yayın
 * onayında "planlandi"ya (kuyrukta, tarihi belli), yayında "yayinda"ya
 * ilerler; revizyonda eski öneriler silinip yenileri yazılır.
 * Tek uç, dört eylem: create | get | status | delete.
 *
 * `get` AYNA DEĞİL, KAYNAK okumasıdır: yayın kuyruğu çıkmadan önce buradan
 * planned_at'i sorar, yani panelde sürüklenen bir kart yayın saatini gerçekten
 * taşır. Backend'in kendi landing havuzu bu iş için KULLANILAMAZ: o havuz her
 * ortamda production'ı gösterir, dev'deki 12 numaralı kartı sorduğunda
 * production'ın 12 numaralı kartıyla cevaplanırdı.
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
    plannedAt?: string
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

    case 'get': {
      const ids = (Array.isArray(body.ids) ? body.ids : [])
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0)
      if (!ids.length) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:ids' })
      const rows = await sql`
        SELECT id, planned_at, all_day, status FROM content_items WHERE id = ANY(${ids}::bigint[])
      `
      // Bulunamayan id sessizce listeden düşer, 404 DEĞİL: kart panelden
      // silinmiş olabilir ve kuyruğun tek bir eksik satır yüzünden durması,
      // kaydettiği tarihle devam etmesinden kötüdür.
      return {
        ok: true,
        items: rows.map((r) => {
          const row = r as { id: unknown; planned_at: unknown; all_day: unknown; status: unknown }
          const plannedAt = row.planned_at ? new Date(row.planned_at as string) : null
          return {
            id: Number(row.id),
            plannedAt: plannedAt && !Number.isNaN(plannedAt.getTime()) ? plannedAt.toISOString() : '',
            allDay: Boolean(row.all_day),
            status: String(row.status ?? ''),
          }
        }),
      }
    }

    case 'status': {
      const id = Number(body.id)
      const status = String(body.status ?? '')
      if (!Number.isInteger(id) || id <= 0)
        throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:id' })
      if (!ALLOWED_STATUS.has(status))
        throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:status' })
      // Kuyruğa alınan yazı tarihini de yazar: panelde "planlandi" görünüp
      // saatin stratejinin ilk önerisinde kalması, tam da bu işin düzeltmeye
      // çalıştığı yanlış tarih olurdu.
      const plannedAt = String(body.plannedAt ?? '').trim() || null
      if (plannedAt && Number.isNaN(new Date(plannedAt).getTime()))
        throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:plannedAt' })
      const rows = plannedAt
        ? await sql`
            UPDATE content_items SET
              status = ${status},
              planned_at = ${plannedAt}::timestamptz,
              all_day = false,
              planned_date = ((${plannedAt}::timestamptz) AT TIME ZONE ${CONTENT_TZ})::date,
              updated_at = now()
            WHERE id = ${id} RETURNING id
          `
        : await sql`
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

import { requireInternalSecret } from '~~/server/utils/internalAuth'
import {
  requireStoreDb,
  upsertStoreApiEntry,
  upsertTrafficSource,
  type StorePlatform,
} from '~~/server/utils/storeMetricsStore'

/**
 * Mağaza ölçümlerinin makine yazma yolu (Go backend → afiet-web,
 * `X-Internal-Secret` ile). Backend Apple'ın Analytics raporunu indirip
 * ayrıştırır, günlük satırları buraya gönderir; landing şemasının sahibi ve
 * doğrulayıcısı burasıdır (içerik hattının takvim/yayın uçlarıyla aynı ilke).
 *
 * Kaynak HER ZAMAN 'api'dir ve panelden elle (ya da CSV ile) girilmiş bir
 * günü ezmez; kural `upsertStoreApiEntry` içindedir. Yazım KISMİDİR: gövdede
 * null gelen alan "ölçülmedi" demektir ve saklanan değer korunur, çünkü iki
 * ayrı Apple raporu aynı günü farklı alanlardan doldurur.
 *
 * Gövde iki liste taşır: günlük toplamlar (`rows`) ve trafik kaynağı kırılımı
 * (`sources`). Backend bunları partiler hâlinde gönderir; bir parti düşerse o
 * günün imi ilerlemez ve bir sonraki tur aynı günü yeniden yazar (upsert aynı
 * anahtarlara düşer).
 *
 * Hatalı satır TÜM isteği düşürür: yarım yazılmış bir gün, hiç yazılmamış bir
 * günden kötüdür (backend bir sonraki tur aynı günü yeniden dener).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_ROWS = 400

type RowInput = {
  metricDate?: string
  platform?: string
  downloads?: number | null
  pageViews?: number | null
  impressions?: number | null
  note?: string
}
type SourceInput = {
  metricDate?: string
  platform?: string
  sourceType?: string
  impressions?: number
  pageViews?: number
}

function sayi(value: unknown, alan: string, opsiyonel = false): number | null {
  if (value === null || value === undefined) {
    if (opsiyonel) return null
    throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:${alan}` })
  }
  const n = Number(value)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0)
    throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:${alan}` })
  return n
}

function platformOku(value: unknown, alan: string): StorePlatform {
  if (value !== 'ios' && value !== 'android')
    throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:${alan}` })
  return value
}

function tarihOku(value: unknown, alan: string): string {
  if (typeof value !== 'string' || !DATE_RE.test(value))
    throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:${alan}` })
  return value
}

export default defineEventHandler(async (event) => {
  requireInternalSecret(event)
  const body = (await readBody(event).catch(() => null)) as {
    rows?: RowInput[]
    sources?: SourceInput[]
  } | null

  const rows = Array.isArray(body?.rows) ? body.rows : []
  const sources = Array.isArray(body?.sources) ? body.sources : []
  if (!rows.length && !sources.length)
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:bos_govde' })
  if (rows.length > MAX_ROWS || sources.length > MAX_ROWS)
    throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:satir_${MAX_ROWS}` })

  const sql = await requireStoreDb(event)

  let yazilan = 0
  for (const [i, r] of rows.entries()) {
    await upsertStoreApiEntry(sql, {
      metricDate: tarihOku(r?.metricDate, `satir_${i + 1}_tarih`),
      platform: platformOku(r?.platform, `satir_${i + 1}_platform`),
      downloads: sayi(r?.downloads, `satir_${i + 1}_indirme`, true),
      pageViews: sayi(r?.pageViews, `satir_${i + 1}_goruntuleme`, true),
      impressions: sayi(r?.impressions, `satir_${i + 1}_gosterim`, true),
      note: typeof r?.note === 'string' ? r.note.trim().slice(0, 300) : '',
    })
    yazilan++
  }

  let kaynakYazilan = 0
  for (const [i, s] of sources.entries()) {
    const sourceType = String(s?.sourceType ?? '').trim().slice(0, 80)
    if (!sourceType)
      throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:kaynak_${i + 1}_tur` })
    await upsertTrafficSource(sql, {
      metricDate: tarihOku(s?.metricDate, `kaynak_${i + 1}_tarih`),
      platform: platformOku(s?.platform, `kaynak_${i + 1}_platform`),
      sourceType,
      impressions: sayi(s?.impressions, `kaynak_${i + 1}_gosterim`) ?? 0,
      pageViews: sayi(s?.pageViews, `kaynak_${i + 1}_goruntuleme`) ?? 0,
    })
    kaynakYazilan++
  }

  return { ok: true, yazilan, kaynakYazilan }
})

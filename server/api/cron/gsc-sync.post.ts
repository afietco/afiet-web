import { requireGscDb } from '~~/server/utils/gscStore'
import { gscServiceAccount, syncGsc, syncGscDiscover } from '~~/server/utils/gsc'

/**
 * Günlük GSC senkronu. Cloud Scheduler çağırır:
 *   app-gsc-sync-prod  30 6 * * *  →  POST /api/cron/gsc-sync
 * Kimlik: `X-Cron-Secret` = NUXT_CRON_SECRET (social-metrics ile aynı desen).
 *
 * GSC verisi ~2 gün geriden gelir; o yüzden sabit 7 günlük kayan pencere her
 * koşuda yeniden çekilip upsert edilir. İlk kurulumda `{"days": 90}` gövdesiyle
 * elle bir kez geriye dönük doldurma yapılır (API 16 aydan eskisini vermez).
 *
 * ARAMA + DISCOVER aynı turda çekilir (ayrı uç açılmadı: aynı ritim yeter ve
 * ikinci bir Scheduler işi ikinci bir sır/izin yüzeyi demekti). İkisi AYRI
 * tablolara yazar ve BİRBİRİNİ DÜŞÜRMEZ: Discover turu hata verirse arama
 * verisi yazılmış olarak kalır ve yanıt `discoverError` ile döner. Tersi de
 * geçerli değil, çünkü Discover arama TAMAMLANDIKTAN sonra koşar.
 */
export default defineEventHandler(async (event) => {
  const expected = String(useRuntimeConfig(event).cronSecret ?? '').trim()
  if (!expected) throw createError({ statusCode: 503, statusMessage: 'cron_sirri_yok' })
  const given = getHeader(event, 'x-cron-secret') ?? ''
  if (given !== expected) throw createError({ statusCode: 401, statusMessage: 'cron_sirri_gecersiz' })

  if (!gscServiceAccount(event)) throw createError({ statusCode: 503, statusMessage: 'gsc_yapilandirilmadi' })
  const sql = await requireGscDb(event)
  const body = (await readBody(event).catch(() => null)) as { days?: number } | null
  const days = Math.min(480, Math.max(3, Number(body?.days) || 7))

  let summary
  try {
    summary = await syncGsc(event, sql, days)
  } catch (err) {
    // Token/gövde loglanmaz; yalnız durum + kısa sebep.
    const message = err instanceof Error ? err.message : 'bilinmeyen hata'
    console.error('[gsc] senkron düştü:', message)
    throw createError({ statusCode: 502, statusMessage: 'gsc_senkron_hatasi' })
  }

  /* Discover ayrı try içinde: bu yüzey eşiğin altındayken bile hata VERMEZ
     (boş yanıt döner), ama düştüğü gün arama verisini de geri almanın anlamı
     yok. Cron 502 yerine 200 + `discoverError` alır; Scheduler'ın yeniden
     denemesi arama tarafını boşuna tekrar çektirmesin. */
  try {
    const discover = await syncGscDiscover(event, sql, days)
    return { ok: true, ...summary, discover }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'bilinmeyen hata'
    console.error('[gsc] discover senkronu düştü:', message)
    return { ok: true, ...summary, discover: null, discoverError: message }
  }
})

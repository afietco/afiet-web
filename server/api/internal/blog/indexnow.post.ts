import { requireInternalSecret } from '~~/server/utils/internalAuth'
import { bildir, kabulEdildi, INDEXNOW_URL_TAVANI } from '#shared/utils/indexnow.mjs'

/**
 * İçerik hattının arama motoru bildirim ucu (Go backend çağırır).
 *
 * NEDEN VAR: IndexNow bildirimi yalnız elle koşan `scripts/publish-post.mjs`
 * içindeydi. Hat yazıyı `/api/internal/blog/publish` ucundan yayınlıyor ve o
 * uç bildirime hiç dokunmuyordu, yani otomatikleşme bildirim yolunu sessizce
 * kopardı. Ölçüm (22 Ağu 2026): hattan çıkan altı yazının beşi Search
 * Console'da "discovered", Google hiç taramamış; elle yayınlananların hepsi
 * indekste.
 *
 * Gönderim backend'de değil BURADA çünkü anahtarın tek kaynağı bu depodaki
 * `public/<anahtar>.txt`; backend'e bir kopyasını koymak ikinci bir doğruluk
 * kaynağı yaratırdı.
 *
 * SÖZLEŞME: yanıt, gönderilenlerin ALT KÜMESİNİ döner, düz bir onay değil.
 * Çağıran yalnız kabul edilenleri damgalar, gerisini bir sonraki tick'te
 * yeniden dener.
 */

const TAVAN = 100

/**
 * Adres gerçekten yayında mı?
 *
 * Yeni yazı bellek cache + ISR yüzünden birkaç dakika 404 döner ve bir
 * tarayıcıyı 404'e yollamak hiç yollamamaktan KÖTÜDÜR: motor adresi ölü
 * işaretler ve bir dahaki gelişi çok daha geç olur. HEAD yeterli, gövde
 * gerekmiyor; sunucusuz istekte zaman aşımı kısa tutulur çünkü cevabı
 * bekleyen bir tick var.
 */
async function yayindaMi(url: string): Promise<boolean> {
  try {
    const res = await $fetch.raw(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      ignoreResponseError: true,
    })
    return res.status === 200
  } catch {
    return false
  }
}

export default defineEventHandler(async (event) => {
  requireInternalSecret(event)

  const anahtar = String(useRuntimeConfig(event).indexnowKey ?? '').trim()
  if (!anahtar) throw createError({ statusCode: 503, statusMessage: 'indexnow_anahtari_yok' })

  const body = await readBody<{ urls?: unknown }>(event)
  const gelen = Array.isArray(body?.urls) ? body.urls : []
  if (!gelen.length) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:urls' })
  if (gelen.length > TAVAN) throw createError({ statusCode: 422, statusMessage: 'cok_fazla_url' })

  // Host, isteğin geldiği origin'den kurulur; sabit afiet.co DEĞİL. Yayın ucu
  // da aynı kuralı izliyor (bkz. publish.post.ts > siteOrigin): preview'da
  // sabit alan adı var olmayan bir sayfayı bildirirdi.
  const host = getRequestURL(event).host

  const urls: string[] = []
  for (const ham of gelen) {
    if (typeof ham !== 'string') throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:urls' })
    let parsed: URL
    try {
      parsed = new URL(ham)
    } catch {
      throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:urls' })
    }
    // Host dışı tek bir adres ucu 422'ye düşürür ve İSTEĞİN TAMAMINI götürür,
    // yani yanındaki doğru adresleri de iptal eder.
    if (parsed.host !== host) throw createError({ statusCode: 422, statusMessage: 'host_disi_url' })
    if (!urls.includes(parsed.toString())) urls.push(parsed.toString())
  }

  const canli: string[] = []
  const bekleyen: string[] = []
  for (const url of urls) {
    if (await yayindaMi(url)) canli.push(url)
    else bekleyen.push(url)
  }

  if (!canli.length) {
    return { ok: true, submitted: [], pending: bekleyen, status: 0, message: 'hiçbir adres henüz yayında değil' }
  }
  if (canli.length > INDEXNOW_URL_TAVANI) {
    throw createError({ statusCode: 422, statusMessage: 'cok_fazla_url' })
  }

  const sonuc = await bildir({ host, anahtar, urls: canli })
  if (!kabulEdildi(sonuc.durum)) {
    // Reddedilen bir gönderim damgalanmamalı, yoksa yazı bir daha hiç
    // bildirilmez. Hata çağırana açık kodla döner.
    throw createError({ statusCode: 502, statusMessage: `indexnow_reddetti:${sonuc.durum}` })
  }

  return {
    ok: true,
    submitted: canli,
    pending: bekleyen,
    status: sonuc.durum,
    message: sonuc.mesaj,
  }
})

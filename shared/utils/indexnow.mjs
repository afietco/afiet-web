/**
 * IndexNow protokolü (Bing, Yandex, Seznam ortak ucu) - SAF kısım.
 *
 * NEDEN AYRI DOSYA: gönderimi iki taraf yapıyor. `scripts/indexnow.mjs` elle
 * koşan CLI için anahtarı `public/` dizininden okur; sunucu tarafındaki
 * `/api/internal/blog/indexnow` ucu ise içerik hattı için aynı işi yapar ama
 * dosya sistemine erişemez (Vercel'de public/ CDN'e gider, fonksiyona değil).
 * Ortak olan yalnız protokoldür ve iki kopyası olmamalıdır: bu depoda iki yere
 * yazılan değerlerin sessizce ayrışma geçmişi var.
 *
 * .mjs, .ts değil: CLI bunu düz `node` ile içe aktarıyor ve derleyici yok.
 * Nuxt tarafı `allowJs` ile JSDoc türlerini okuyor.
 *
 * ANAHTAR BURADA DEĞİL. Tek kaynağı `public/<anahtar>.txt` dosyasıdır;
 * çağıran onu nereden bulduysa oradan geçirir. Anahtar gizli değildir,
 * olamaz da: protokol sahipliği anahtarı sitenin kendisinden okuyarak
 * doğrular.
 */

/** IndexNow'ın ortak ucu; katılımcı motorlar birbirine dağıtır. */
export const INDEXNOW_UC = 'https://api.indexnow.org/indexnow'

/** Tek istekte kabul edilen üst sınır. */
export const INDEXNOW_URL_TAVANI = 10000

/**
 * Gönderilecek gövdeyi kurar ve girdiyi doğrular.
 *
 * @param {{ host: string, anahtar: string, urls: string[] }} girdi
 * @returns {{ host: string, key: string, keyLocation: string, urlList: string[] }}
 */
export function govdeKur({ host, anahtar, urls }) {
  if (!anahtar) throw new Error('IndexNow anahtarı yok')
  if (!urls.length) throw new Error('gönderilecek URL yok')
  if (urls.length > INDEXNOW_URL_TAVANI)
    throw new Error(`tek istekte en fazla ${INDEXNOW_URL_TAVANI} URL`)

  // Host dışı adres ucu 422 ile düşürür ve İSTEĞİN TAMAMINI götürür, yani
  // bir yanlış adres yanındaki doğruları da iptal eder.
  const yabanci = urls.filter((u) => new URL(u).host !== host)
  if (yabanci.length) throw new Error(`host dışı URL var (${yabanci[0]}); uç bunu 422 ile reddeder`)

  return {
    host,
    key: anahtar,
    keyLocation: `https://${host}/${anahtar}.txt`,
    urlList: urls,
  }
}

/**
 * URL'leri bildirir.
 *
 * @param {{ host: string, anahtar: string, urls: string[], kuru?: boolean }} girdi
 * @returns {Promise<{ durum: number, mesaj: string, govde?: object }>}
 */
export async function bildir({ host, anahtar, urls, kuru = false }) {
  const govde = govdeKur({ host, anahtar, urls })
  if (kuru) return { durum: 0, mesaj: `kuru koşu: ${urls.length} URL gönderilecekti`, govde }

  const res = await fetch(INDEXNOW_UC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(govde),
  })
  return { durum: res.status, mesaj: aciklama(res.status) }
}

/** Uç sessiz kodlar döndürüyor; hangisinin ne demek olduğu tek yerde dursun. */
export function aciklama(kod) {
  switch (kod) {
    case 200: return 'kabul edildi'
    // 202 ilk gönderimlerde NORMALDİR ve tek başına bir arıza göstermez:
    // uç anahtarı henüz doğrulamamıştır, birazdan dosyayı çekip doğrular.
    case 202: return 'kabul edildi, anahtar doğrulaması beklemede (ilk gönderimlerde normal)'
    case 400: return 'geçersiz istek (biçim hatası)'
    case 403: return 'anahtar geçersiz: public/<anahtar>.txt yayında değil ya da içeriği tutmuyor'
    case 422: return 'URL host ile uyuşmuyor ya da anahtar eşleşmiyor'
    case 429: return 'çok fazla istek (kısıtlandık)'
    default: return `beklenmeyen kod ${kod}`
  }
}

/** Uç 200 ve 202'yi kabul sayar; ikisi de "aldım" demektir. */
export function kabulEdildi(kod) {
  return kod === 200 || kod === 202
}

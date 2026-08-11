/**
 * IndexNow gönderimi (Bing, Yandex, Seznam ortak protokolü).
 *
 * NEDEN VAR: Google'ın Indexing API'si yalnız JobPosting/BroadcastEvent kabul
 * ettiği için GSC'de indeksleme talebi ELLE tıklanmak zorunda. IndexNow'da
 * öyle değil; yeni ya da değişen URL anında bildirilir ve tarama beklenmez.
 * Bing bizim için ayrıca ChatGPT aramasının giriş kapısı.
 *
 * ANAHTARIN TEK KAYNAĞI `public/<anahtar>.txt` DOSYASIDIR. Dosyanın ADI
 * anahtardır ve İÇERİĞİ de aynı anahtardır, yani dosya kendi kendisiyle
 * tutarlıdır ve ikinci bir yere yazılmadığı için sapamaz. Anahtarı buraya
 * ya da başka bir sabite KOPYALAMA: bu depoda iki yere yazılan değerlerin
 * sessizce ayrışma geçmişi var (bkz. seoDefaults > sameAs, DB enum'ları).
 *
 * Anahtar GİZLİ DEĞİLDİR, olamaz da: protokol, anahtarı sitenin kendisinden
 * okuyarak site sahipliğini doğrular. Herkes okuyabilir; kötüye kullanımın
 * tavanı, birinin bizim URL'lerimizi bize bildirmesidir.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const KOK = fileURLToPath(new URL('..', import.meta.url))
const UC = 'https://api.indexnow.org/indexnow'

/** public/ içindeki tek anahtar dosyasını bulur; belirsizlikte yüksek sesle düşer. */
export function anahtarOku() {
  const dizin = join(KOK, 'public')
  const adaylar = readdirSync(dizin).filter((f) => /^[a-f0-9]{16,128}\.txt$/i.test(f))
  if (adaylar.length !== 1) {
    throw new Error(
      `public/ içinde tam olarak BİR IndexNow anahtar dosyası bekleniyordu, ${adaylar.length} bulundu: ${adaylar.join(', ') || '(yok)'}`,
    )
  }
  const anahtar = adaylar[0].replace(/\.txt$/i, '')
  const icerik = readFileSync(join(dizin, adaylar[0]), 'utf8').trim()
  if (icerik !== anahtar) {
    throw new Error(`Anahtar dosyasının içeriği adıyla uyuşmuyor (${adaylar[0]}); IndexNow bunu 403 ile reddeder.`)
  }
  return anahtar
}

/**
 * URL'leri bildirir. Hepsi aynı host'a ait olmalı, yoksa uç 422 döner.
 * Tek istekte en fazla 10.000 URL kabul ediliyor.
 */
export async function gonder(urls, { host = 'afiet.co', kuru = false } = {}) {
  if (!urls.length) return { durum: 0, mesaj: 'gönderilecek URL yok' }
  if (urls.length > 10000) throw new Error('tek istekte en fazla 10.000 URL')

  const yabanci = urls.filter((u) => new URL(u).host !== host)
  if (yabanci.length) throw new Error(`host dışı URL var (${yabanci[0]}); uç bunu 422 ile reddeder`)

  const anahtar = anahtarOku()
  const govde = {
    host,
    key: anahtar,
    keyLocation: `https://${host}/${anahtar}.txt`,
    urlList: urls,
  }
  if (kuru) return { durum: 0, mesaj: `kuru koşu: ${urls.length} URL gönderilecekti`, govde }

  const res = await fetch(UC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(govde),
  })
  return { durum: res.status, mesaj: aciklama(res.status), govde: undefined }
}

/** Uç sessiz kodlar döndürüyor; hangisinin ne demek olduğu tek yerde dursun. */
export function aciklama(kod) {
  switch (kod) {
    case 200: return 'kabul edildi'
    case 202: return 'kabul edildi, anahtar doğrulaması beklemede (anahtar dosyası henüz yayında olmayabilir)'
    case 400: return 'geçersiz istek (biçim hatası)'
    case 403: return 'anahtar geçersiz: public/<anahtar>.txt yayında değil ya da içeriği tutmuyor'
    case 422: return 'URL host ile uyuşmuyor ya da anahtar eşleşmiyor'
    case 429: return 'çok fazla istek (kısıtlandık)'
    default: return `beklenmeyen kod ${kod}`
  }
}

/** Canlı sitemap'teki tüm URL'leri okur. */
export async function sitemaptenOku(host = 'afiet.co') {
  const xml = await fetch(`https://${host}/sitemap.xml`).then((r) => r.text())
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

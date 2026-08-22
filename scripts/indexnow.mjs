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

import { bildir, aciklama } from '../shared/utils/indexnow.mjs'

const KOK = fileURLToPath(new URL('..', import.meta.url))

// Protokolün kendisi shared/utils/indexnow.mjs'de: içerik hattının sunucu ucu
// da aynı gövdeyi kuruyor ve dosya sistemine erişemiyor. Burada kalan tek şey
// anahtarı DİSKTEN okumak, ki o yalnız elle koşan CLI'nın yapabileceği iş.
export { aciklama }

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
 * URL'leri bildirir. Anahtarı diskten okur, gerisini protokol modülü yapar.
 * Boş liste bir hata değil, yapacak iş olmamasıdır (CLI hep öyle çağırıyor).
 */
export async function gonder(urls, { host = 'afiet.co', kuru = false } = {}) {
  if (!urls.length) return { durum: 0, mesaj: 'gönderilecek URL yok' }
  return bildir({ host, anahtar: anahtarOku(), urls, kuru })
}

/** Canlı sitemap'teki tüm URL'leri okur. */
export async function sitemaptenOku(host = 'afiet.co') {
  const xml = await fetch(`https://${host}/sitemap.xml`).then((r) => r.text())
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

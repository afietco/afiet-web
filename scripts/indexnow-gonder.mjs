/**
 * IndexNow gönderimi (elle). Protokol ve anahtar kuralları: `indexnow.mjs`.
 *
 * Kullanım:
 *   node scripts/indexnow-gonder.mjs --sitemap            # canlı sitemap'teki her URL
 *   node scripts/indexnow-gonder.mjs https://afiet.co/... # tek tek URL
 *   node scripts/indexnow-gonder.mjs --sitemap --kuru     # göndermeden ne olacağını göster
 *
 * Anahtar dosyası CANLIDA olmadan gönderim 403 döner; script bu yüzden önce
 * dosyayı üretimden çekip doğrular ve öyle gönderir.
 */
import { anahtarOku, gonder, sitemaptenOku } from './indexnow.mjs'

const argv = process.argv.slice(2)
const kuru = argv.includes('--kuru')
const sitemapten = argv.includes('--sitemap')
const elle = argv.filter((a) => a.startsWith('https://'))

if (!sitemapten && !elle.length) {
  console.error('Kullanım: node scripts/indexnow-gonder.mjs (--sitemap | <url>…) [--kuru]')
  process.exit(1)
}

const anahtar = anahtarOku()
console.log(`anahtar: ${anahtar.slice(0, 6)}… (public/${anahtar}.txt)`)

// Anahtar dosyası yayında mı? IndexNow bunu kendisi de kontrol ediyor ama
// oradan gelen 403 sebebi söylemiyor; burada net söylensin.
const kontrol = await fetch(`https://afiet.co/${anahtar}.txt`)
const canliIcerik = kontrol.ok ? (await kontrol.text()).trim() : ''
if (canliIcerik !== anahtar) {
  console.error(
    `\nDUR: anahtar dosyası canlıda doğrulanamadı (HTTP ${kontrol.status}).` +
    `\nhttps://afiet.co/${anahtar}.txt yayına çıkmadan gönderim 403 döner.`,
  )
  process.exit(1)
}
console.log('anahtar dosyası canlıda doğrulandı')

const urls = sitemapten ? await sitemaptenOku() : elle
console.log(`gönderilecek URL: ${urls.length}`)

const sonuc = await gonder(urls, { kuru })
console.log(`sonuç: HTTP ${sonuc.durum} - ${sonuc.mesaj}`)
if (sonuc.durum && sonuc.durum >= 400) process.exit(1)

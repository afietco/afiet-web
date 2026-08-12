/**
 * /basin sayfasının dosyalarını üretir: logo paketi (SVG + PNG), ekran
 * görüntüleri, önizlemeleri ve tek arşiv.
 *
 * ÇIKTI KLASÖRÜ `public/basin-kiti/`, sayfanın yolu `/basin`. İkisi bilerek
 * AYRI adtadır: public/ altında sayfayla aynı adı taşıyan bir klasör statik
 * sunucuda o rotayı gölgeler ve /basin isteği /basin/ dizinine 301 atar.
 *
 * Kaynak afiet-brand'dir (logolar `logo/`, ekranlar `appstore/out/iphone-6.5/`).
 * O repo YALNIZ bu makinede yaşıyor, o yüzden script CI'da koşmaz: çıktısı
 * public/ altında commit'lenir ve sayfa yalnız commit'lenmiş dosyaları okur.
 * Yani bu script'i çalıştırmak bir kurulum adımı DEĞİL, malzeme yenileme
 * adımıdır (yeni ekran görüntüsü çekildiğinde ya da logo değiştiğinde).
 *
 * Dosya adları `shared/utils/marka.ts > BASIN_VARLIKLARI` ile birebir aynı
 * olmalıdır; sayfa yolları oradan okur.
 *
 * Kullanım:  node scripts/basin-kiti.mjs
 *            BRAND_DIR=/başka/yol node scripts/basin-kiti.mjs
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright-core'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const BRAND = process.env.BRAND_DIR || path.resolve(root, '../afiet-brand')
const OUT = path.join(root, 'public/basin-kiti')
const STAGE = path.join(root, '.basin-stage')

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

if (!existsSync(BRAND)) {
  console.error(`afiet-brand bulunamadı: ${BRAND}\nBRAND_DIR ile yolu ver.`)
  process.exit(1)
}

/* Logo dosyaları: hepsi arşive girer, dördü sayfada gösterilir. */
const LOGOLAR = [
  'lockup-horizontal.svg',
  'lockup-vertical.svg',
  'wordmark.svg',
  'wordmark-ink.svg',
  'wordmark-white.svg',
  'wordmark-tagline.svg',
  'afi-icon.svg',
  'afi-emerald.svg',
  'afi-ink.svg',
  'afi-white.svg',
  'afi-mono.svg',
]

/* PNG karşılığı üretilenler: basının çoğu SVG açamıyor. */
const PNG_ISTENENLER = [
  { file: 'lockup-horizontal.svg', w: 2000, koyu: false },
  { file: 'lockup-horizontal-beyaz.svg', w: 2000, koyu: true },
  { file: 'wordmark.svg', w: 1600, koyu: false },
  { file: 'afi-emerald.svg', w: 1024, koyu: false },
  { file: 'afi-icon.svg', w: 1024, koyu: false },
]

const EKRANLAR = [
  '1-bugun.png',
  '2-hizli-kayit.png',
  '3-denge.png',
  '4-grubum.png',
  '5-vucudum.png',
  '6-besin-rehberi.png',
]

/* Tek cümlelik tanım: arşivdeki OKU.txt de aynı cümleyi taşır. Kaynak
   shared/utils/marka.ts; burada TS içe aktaramadığımız için metin ayıklanır,
   böylece iki yerde iki farklı cümle kalma ihtimali kalmaz. */
function markaTanimi() {
  const src = readFileSync(path.join(root, 'shared/utils/marka.ts'), 'utf8')
  const blok = src.match(/tr:\s*([\s\S]*?),\n\s*en:/)
  if (!blok) throw new Error('marka.ts içinde tanım cümlesi bulunamadı')
  return blok[1]
    .split('+')
    .map((p) => p.trim().replace(/^['"]|['"]$/g, ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Koyu zemin için beyaz kilit. afiet-brand bu varyantı ÜRETMİYOR
 * (build-wordmark.py yalnız marka yeşili kilidi yazıyor), o yüzden burada
 * iki dokümante rengi değiştirerek türetilir: wordmark #059669 → beyaz,
 * tagline #605a4f → nane (#a7f3d0). İkon karesi kendi degradesini korur,
 * koyu zeminde zaten okunur. Brand tarafında resmî bir beyaz kilit
 * yayınlanırsa bu adım silinir ve dosya doğrudan kopyalanır.
 */
function beyazKilitTuret() {
  const kaynak = readFileSync(path.join(BRAND, 'logo/lockup-horizontal.svg'), 'utf8')
  return kaynak.replace(/fill="#059669"/g, 'fill="#ffffff"').replace(/fill="#605a4f"/g, 'fill="#a7f3d0"')
}

rmSync(OUT, { recursive: true, force: true })
rmSync(STAGE, { recursive: true, force: true })
mkdirSync(path.join(OUT, 'logo'), { recursive: true })
mkdirSync(path.join(OUT, 'ekran/onizleme'), { recursive: true })
mkdirSync(path.join(STAGE, 'afiet-basin-kiti/logo'), { recursive: true })
mkdirSync(path.join(STAGE, 'afiet-basin-kiti/ekran'), { recursive: true })

// ── SVG'ler ────────────────────────────────────────────────────────────
for (const f of LOGOLAR) {
  cpSync(path.join(BRAND, 'logo', f), path.join(OUT, 'logo', f))
  cpSync(path.join(BRAND, 'logo', f), path.join(STAGE, 'afiet-basin-kiti/logo', f))
}
const beyaz = beyazKilitTuret()
writeFileSync(path.join(OUT, 'logo/lockup-horizontal-beyaz.svg'), beyaz)
writeFileSync(path.join(STAGE, 'afiet-basin-kiti/logo/lockup-horizontal-beyaz.svg'), beyaz)

// ── Ekran görüntüleri ──────────────────────────────────────────────────
for (const f of EKRANLAR) {
  const src = path.join(BRAND, 'appstore/out/iphone-6.5', f)
  cpSync(src, path.join(OUT, 'ekran', f))
  cpSync(src, path.join(STAGE, 'afiet-basin-kiti/ekran', f))
}

// ── Chrome: SVG → PNG ve ekran önizlemeleri ────────────────────────────
const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage({ deviceScaleFactor: 1 })

async function pngYaz(svgYolu, hedef, genislik, koyu) {
  const svg = readFileSync(svgYolu, 'utf8')
  const b64 = Buffer.from(svg, 'utf8').toString('base64')
  await page.setViewportSize({ width: genislik, height: 400 })
  await page.setContent(
    `<style>html,body{margin:0;background:${koyu ? '#022c22' : 'transparent'}}
     img{display:block;width:${genislik}px}</style>
     <img id="l" src="data:image/svg+xml;base64,${b64}">`,
  )
  const el = await page.waitForSelector('#l')
  /* Açık zeminli logolar SAYDAM PNG olarak verilir (basın kendi zeminine
     koyar); koyu zemin sürümü marka koyusuyla düz basılır, aksi hâlde beyaz
     wordmark beyaz sayfada kaybolur. */
  await el.screenshot({ path: hedef, omitBackground: !koyu })
}

for (const { file, w, koyu } of PNG_ISTENENLER) {
  const kaynak = path.join(OUT, 'logo', file)
  const ad = file.replace(/\.svg$/, '.png')
  await pngYaz(kaynak, path.join(OUT, 'logo', ad), w, koyu)
  cpSync(path.join(OUT, 'logo', ad), path.join(STAGE, 'afiet-basin-kiti/logo', ad))
}

for (const f of EKRANLAR) {
  const png = readFileSync(path.join(OUT, 'ekran', f))
  const b64 = png.toString('base64')
  await page.setViewportSize({ width: 428, height: 926 })
  await page.setContent(
    `<style>html,body{margin:0}img{display:block;width:428px}</style>
     <img id="s" src="data:image/png;base64,${b64}">`,
  )
  const el = await page.waitForSelector('#s')
  await el.screenshot({
    path: path.join(OUT, 'ekran/onizleme', f.replace(/\.png$/, '.jpg')),
    type: 'jpeg',
    quality: 82,
  })
}

await browser.close()

// ── Arşiv ──────────────────────────────────────────────────────────────
writeFileSync(
  path.join(STAGE, 'afiet-basin-kiti/OKU.txt'),
  [
    'afiet basın kiti',
    '',
    markaTanimi(),
    '',
    'Kullanım',
    '- Malzemenin tamamı haber, inceleme ve liste yazılarında serbestçe kullanılır.',
    '- Adı her yerde küçük harfle yazılır: afiet. Cümle başında bile.',
    '- Logo rengi değiştirilmez, gerilmez, üzerine gölge ya da kontur eklenmez.',
    '- Koyu zeminde lockup-horizontal-beyaz kullanılır.',
    '',
    'İçindekiler',
    '- logo/   marka logoları (SVG kaynak + basın için PNG)',
    '- ekran/  uygulama ekran görüntüleri, 1284 x 2778',
    '',
    'Güncel sürüm ve iletişim: https://afiet.co/basin  ·  destek@afiet.co',
    '',
  ].join('\n'),
)

execFileSync('zip', ['-qr', path.join(OUT, 'afiet-basin-kiti.zip'), 'afiet-basin-kiti'], {
  cwd: STAGE,
})
rmSync(STAGE, { recursive: true, force: true })

console.log(`Bitti: ${path.relative(root, OUT)} (logo ${LOGOLAR.length + 1}, ekran ${EKRANLAR.length}, zip 1)`)

/**
 * Sosyal paylaşım görselini (public/og.png, 1200×630) ve favicon.ico'yu
 * (32×32, PNG gömülü ICO) üretir.
 * Kaynak tek gerçek: public/icon.svg (Afi) + Nunito (node_modules'ten).
 * Bu makinede sistem Chrome'u kullanılır (playwright-core, browser indirmez).
 * Kullanım: npm run assets
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from 'playwright-core'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const icon = readFileSync(path.join(root, 'public/icon.svg'), 'utf8')
const fontPath = path.join(
  root,
  'node_modules/@fontsource-variable/nunito/files/nunito-latin-wght-normal.woff2',
)

const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const html = `<!doctype html>
<style>
  @font-face {
    font-family: 'Nunito Variable';
    src: url('file://${fontPath}') format('woff2-variations');
    font-weight: 200 1000;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    display: flex; align-items: center; justify-content: center; gap: 72px;
    font-family: 'Nunito Variable', sans-serif;
    background: linear-gradient(135deg, #10b981, #047857);
    overflow: hidden; position: relative;
  }
  .glow {
    position: absolute; border-radius: 50%; filter: blur(90px);
  }
  .icon { width: 300px; height: 300px; filter: drop-shadow(0 24px 48px rgb(2 44 34 / .35)); position: relative; }
  .icon svg { width: 100%; height: 100%; }
  .text { position: relative; color: #fff; }
  .text h1 { font-size: 148px; font-weight: 900; letter-spacing: -0.03em; line-height: 1; }
  .text p { font-size: 54px; font-weight: 800; color: #a7f3d0; margin-top: 18px; }
</style>
<body>
  <div class="glow" style="width:520px;height:520px;background:rgb(167 243 208/.35);top:-260px;left:-140px"></div>
  <div class="glow" style="width:480px;height:480px;background:rgb(2 44 34/.5);bottom:-260px;right:-120px"></div>
  <div class="icon">${icon}</div>
  <div class="text">
    <h1>afiet</h1>
    <p>Sayma, dengele.</p>
  </div>
</body>`

const browser = await chromium.launch({ executablePath: CHROME })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html)
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: path.join(root, 'public/og.png') })

// favicon.ico: Afi'yi 32×32 şeffaf PNG olarak çek, tek girdili ICO'ya paketle
// (PNG gömülü ICO her modern istemcide geçerli). /favicon.ico'yu ısrarla
// isteyen istemciler (bazı SERP favicon botları, eski araçlar) için.
const fav = await browser.newPage({ viewport: { width: 32, height: 32 } })
await fav.setContent(
  `<!doctype html><style>*{margin:0}body{width:32px;height:32px}svg{width:32px;height:32px;display:block}</style><body>${icon}</body>`,
)
const png = await fav.screenshot({ omitBackground: true })
const header = Buffer.alloc(22)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // tip: icon
header.writeUInt16LE(1, 4) // görüntü sayısı
header.writeUInt8(32, 6) // genişlik
header.writeUInt8(32, 7) // yükseklik
header.writeUInt8(0, 8) // palet yok
header.writeUInt8(0, 9) // reserved
header.writeUInt16LE(1, 10) // düzlem
header.writeUInt16LE(32, 12) // bpp
header.writeUInt32LE(png.length, 14) // veri boyu
header.writeUInt32LE(22, 18) // veri ofseti
writeFileSync(path.join(root, 'public/favicon.ico'), Buffer.concat([header, png]))

await browser.close()
console.log('✓ public/og.png (1200×630)')
console.log('✓ public/favicon.ico (32×32 PNG-ICO)')

import { chromium } from 'playwright-core'

const out = process.argv[2] || '/tmp/durum.png'
const width = Number(process.argv[3] || 1280)
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
})
const page = await browser.newPage({ viewport: { width, height: 900 } })
await page.goto('http://localhost:3177/durum', { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
// reveal animasyonlari tamamlansin diye sayfayi bir kez asagi yukari gezdir
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(900)
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(600)
await page.screenshot({ path: out, fullPage: true })
await browser.close()
console.log('ok', out)

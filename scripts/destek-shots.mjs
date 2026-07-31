/**
 * Destek merkezinin ekran görüntülerini üretir (tasarım onayı için).
 * Kullanım: npm run build && node scripts/destek-shots.mjs
 * Çıktı: SHOT_DIR (varsayılan .shots/)
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('..', import.meta.url))
const PORT = 4320
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = process.env.SHOT_DIR || join(root, '.shots')

if (!existsSync(join(root, '.output/server/index.mjs'))) {
  console.error('.output yok - önce `npm run build` çalıştır.')
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })

const server = spawn('node', ['.output/server/index.mjs'], {
  cwd: root,
  stdio: 'ignore',
  env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT), NUXT_PUBLIC_ASK_API_URL: 'mock' },
})

let browser
try {
  for (let i = 0; ; i++) {
    try {
      await fetch(`http://localhost:${PORT}/`)
      break
    } catch {
      if (i > 50) throw new Error('Nitro sunucusu açılmadı')
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  browser = await chromium.launch({ executablePath: CHROME, headless: true })

  /** Kaydırma ile beliren bloklar yerine otursun diye sayfayı bir tur gez. */
  const settle = async (page) => {
    await page.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += innerHeight * 0.7) {
        scrollTo({ top: y, behavior: 'instant' })
        await new Promise((r) => setTimeout(r, 90))
      }
      scrollTo({ top: 0, behavior: 'instant' })
      await new Promise((r) => setTimeout(r, 350))
    })
  }

  const cek = async (ad, yol, viewport, { tamSayfa = false, once } = {}) => {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 })
    await page.goto(`http://localhost:${PORT}${yol}`, { waitUntil: 'networkidle' })
    await settle(page)
    if (once) await once(page)
    await page.screenshot({ path: join(OUT, `${ad}.png`), fullPage: tamSayfa })
    await page.close()
    console.log(`  ✓ ${ad}.png`)
  }

  const masa = { width: 1440, height: 900 }
  const mobil = { width: 390, height: 844 }

  await cek('01-hub-masaustu', '/destek', masa)
  await cek('02-hub-tam', '/destek', masa, { tamSayfa: true })
  await cek('03-hub-arama-acik', '/destek', masa, {
    once: async (page) => {
      await page.locator('#destek-ara-buyuk').click()
      await page.locator('#destek-ara-buyuk').fill('grup')
      await page.locator('#destek-sonuclar [role="option"]').first().waitFor({ timeout: 8000 })
      await page.waitForTimeout(250)
    },
  })
  await cek('04-kategori-masaustu', '/destek/ogun-kaydi', masa)
  await cek(
    '05-yazi-masaustu',
    '/destek/ogun-kaydi/ogunu-duzenleme-ve-silme',
    masa,
  )
  await cek(
    '06-yazi-tam',
    '/destek/ogun-kaydi/ogunu-duzenleme-ve-silme',
    masa,
    { tamSayfa: true },
  )
  await cek('07-hub-mobil', '/destek', mobil, { tamSayfa: true })
  await cek(
    '08-yazi-mobil',
    '/destek/denge-ritim/afiyet-gunu-ve-ritim',
    mobil,
    { tamSayfa: true },
  )

  console.log(`\nEkran görüntüleri: ${OUT}`)
} finally {
  await browser?.close()
  server.kill()
}

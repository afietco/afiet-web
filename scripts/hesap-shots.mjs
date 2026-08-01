/**
 * Hesaplama araçlarının ekran görüntüleri (tasarım onayı için).
 * Kullanım: npm run build && node scripts/hesap-shots.mjs
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('..', import.meta.url))
const PORT = 4330
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
  env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT) },
})

let browser
try {
  for (let i = 0; ; i++) {
    try { await fetch(`http://localhost:${PORT}/`); break } catch {
      if (i > 50) throw new Error('Nitro sunucusu açılmadı')
      await new Promise((r) => setTimeout(r, 200))
    }
  }
  browser = await chromium.launch({ executablePath: CHROME, headless: true })

  const doldur = async (page, { yas = '34', boy = '172', kilo = '74' } = {}) => {
    await page.getByLabel('Yaş').fill(yas)
    await page.getByLabel('Boy (cm)').fill(boy)
    await page.getByLabel('Kilo (kg)').fill(kilo)
    await page.getByRole('button', { name: /Tabağımı göster|Yeniden hesapla/ }).click()
    await page.locator('[aria-live="polite"]').waitFor({ timeout: 8000 })
    await page.waitForTimeout(500)
  }

  const shoot = async (name, path, viewport, { fullPage = false, before } = {}) => {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 })
    await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    if (before) await before(page)
    await page.screenshot({ path: join(OUT, `${name}.png`), fullPage })
    await page.close()
    console.log(`  ✓ ${name}.png`)
  }

  const desktop = { width: 1440, height: 900 }
  const mobile = { width: 390, height: 844 }

  await shoot('h1-hub', '/hesapla', desktop)
  await shoot('h2-form', '/hesapla/sofra-payin', desktop)
  await shoot('h3-sonuc', '/hesapla/sofra-payin', desktop, {
    fullPage: true, before: (p) => doldur(p),
  })
  await shoot('h4-sayilar-acik', '/hesapla/sofra-payin', desktop, {
    fullPage: true,
    before: async (p) => { await doldur(p); await p.getByText('Sayıları göster').click(); await p.waitForTimeout(400) },
  })
  await shoot('h5-18-alti', '/hesapla/sofra-payin', desktop, {
    fullPage: true, before: (p) => doldur(p, { yas: '16', boy: '165', kilo: '55' }),
  })
  await shoot('h6-sonuc-mobil', '/hesapla/sofra-payin', mobile, {
    fullPage: true, before: (p) => doldur(p),
  })

  console.log(`\nEkran görüntüleri: ${OUT}`)
} finally {
  await browser?.close()
  server.kill()
}

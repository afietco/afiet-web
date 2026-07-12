/**
 * Uçtan uca smoke testi — build edilmiş siteyi (.output) Nitro sunucusuyla açar,
 * gerçek Chrome'da içerik/SEO/etkileşim assert'leri koşar.
 *
 * Kullanım: npm run build && npm run smoke
 * Ortam: CHROME_PATH (CI: /usr/bin/google-chrome), SHOT_DIR (ekran görüntüsü klasörü, ops.)
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('..', import.meta.url))
const PORT = 4310
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

if (!existsSync(join(root, '.output/server/index.mjs'))) {
  console.error('.output yok — önce `npm run build` çalıştır.')
  process.exit(1)
}

const server = spawn('node', ['.output/server/index.mjs'], {
  cwd: root,
  stdio: 'ignore',
  env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT) },
})

const ok = (cond, msg) => {
  if (!cond) throw new Error(`ASSERT: ${msg}`)
  console.log(`  ✓ ${msg}`)
}

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

  // --- Prerender/SEO: JS çalışmadan da içerik HTML'de olmalı ---
  const html = await (await fetch(`http://localhost:${PORT}/`)).text()
  ok(html.includes('lang="tr"'), 'html lang="tr"')
  ok(html.includes('Sayma,') && html.includes('dengele.'), 'hero metni prerender HTML içinde')
  ok(html.includes('og:image'), 'og:image meta mevcut')
  ok(html.includes('Çünkü sofra sayı saymaz.'), 'zag bölümü prerender HTML içinde')

  browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })

  ok((await page.title()).includes('afiet'), `başlık: ${await page.title()}`)
  await page.getByRole('heading', { level: 1 }).waitFor()
  ok(true, 'h1 görünür')

  // --- Bölümler ve içerik sayıları ---
  ok((await page.locator('#neden article').count()) === 4, '4 zag kartı')
  ok((await page.locator('ul li p').count()) === 4, '4 ses tonu balonu')
  ok((await page.locator('#haber').count()) === 1, 'bekleme listesi bölümü mevcut')

  // --- Scroll reveal çalışıyor ---
  await page.locator('#haber').scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)
  const revealed = await page.locator('.reveal.is-in').count()
  ok(revealed > 0, `scroll reveal çalışıyor (${revealed} eleman)`)

  // --- Header CTA ana bölüme kaydırıyor ---
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('navigation').getByRole('link', { name: 'Haber ver' }).click()
  await page.waitForTimeout(1200)
  const nearHaber = await page.evaluate(() => {
    const r = document.getElementById('haber').getBoundingClientRect()
    return r.top > -50 && r.top < window.innerHeight
  })
  ok(nearHaber, '"Haber ver" tıklaması #haber bölümüne götürüyor')

  ok(errors.length === 0, `konsol/sayfa hatası yok${errors.length ? `: ${errors[0]}` : ''}`)

  // --- İsteğe bağlı ekran görüntüleri ---
  if (process.env.SHOT_DIR) {
    mkdirSync(process.env.SHOT_DIR, { recursive: true })
    // Reveal animasyonları bitmiş halde yakalamak için sayfayı adım adım gez
    const settle = async () => {
      await page.evaluate(async () => {
        for (let y = 0; y <= document.body.scrollHeight; y += innerHeight * 0.7) {
          scrollTo({ top: y, behavior: 'instant' })
          await new Promise((r) => setTimeout(r, 180))
        }
        scrollTo({ top: 0, behavior: 'instant' })
      })
      await page.waitForTimeout(900)
    }
    await settle()
    await page.screenshot({ path: join(process.env.SHOT_DIR, 'desktop-full.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await settle()
    await page.screenshot({ path: join(process.env.SHOT_DIR, 'mobile-full.png'), fullPage: true })
    console.log(`  → ekran görüntüleri: ${process.env.SHOT_DIR}`)
  }

  console.log('\nSMOKE OK ✅')
} catch (e) {
  console.error(`\nSMOKE FAILED ❌  ${e.message}`)
  process.exitCode = 1
} finally {
  await browser?.close()
  server.kill()
}

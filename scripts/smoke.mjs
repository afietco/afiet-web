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
  env: {
    ...process.env,
    PORT: String(PORT),
    NITRO_PORT: String(PORT),
    // "Afi'ye sor" paneli boş URL'de hiç render edilmez; smoke'ta sahte akışla
    // açıyoruz ki bölüm ve etkileşim gerçekten test edilsin.
    NUXT_PUBLIC_ASK_API_URL: 'mock',
  },
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

  // --- Beta başvuru route'u (/api/beta/apply) ---
  // Yalnız REDDEDİLEN durumlar denenir: geçerli başvuru DB'ye yazardı ve
  // smoke koşusu gerçek başvuru tablosunu kirletmemeli.
  const post = (body) =>
    fetch(`http://localhost:${PORT}/api/beta/apply`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

  const invalid = await post({ email: 'not-an-email', consent: true })
  ok(invalid.status === 422, `geçersiz e-posta → 422 (${invalid.status})`)

  const noConsent = await post({ email: 'smoke@afiet.co', consent: false })
  ok(noConsent.status === 422, `rıza yoksa → 422 (${noConsent.status})`)

  const honey = await post({ email: 'bot@afiet.co', consent: true, company: 'spam-co' })
  const honeyBody = await honey.json().catch(() => ({}))
  ok(honey.status === 200 && honeyBody.status === 'ok', `honeypot dolu → sessiz ok (${honey.status})`)

  // --- SEO & GEO yüzeyi (DB'siz ortamda kod varsayılanlarıyla çalışmalı) ---
  const robots = await (await fetch(`http://localhost:${PORT}/robots.txt`)).text()
  ok(robots.includes('Sitemap:'), 'robots.txt Sitemap satırı içeriyor')
  ok(robots.includes('Bytespider'), 'robots.txt Bytespider engeli içeriyor')

  const sitemapRes = await fetch(`http://localhost:${PORT}/sitemap.xml`)
  const sitemap = await sitemapRes.text()
  ok(
    (sitemapRes.headers.get('content-type') || '').includes('xml') &&
      sitemap.includes('<urlset') &&
      (sitemap.match(/<loc>/g) || []).length >= 3,
    'sitemap.xml gerçek XML ve ≥3 sayfa listeliyor',
  )

  const llms = await (await fetch(`http://localhost:${PORT}/llms.txt`)).text()
  ok(llms.startsWith('# afiet'), 'llms.txt yayında')

  const missing = await fetch(`http://localhost:${PORT}/olmayan-sayfa-smoke`)
  ok(missing.status === 404, `bilinmeyen yol gerçek 404 (${missing.status})`)

  // --- Blog yüzeyi (DB'siz ortamda boş liste; statüler yine tutarlı olmalı) ---
  const blogRes = await fetch(`http://localhost:${PORT}/blog`)
  const blogHtml = await blogRes.text()
  ok(
    blogRes.status === 200 && blogHtml.includes('Sofradan notlar'),
    `/blog 200 ve liste sayfası render oluyor (${blogRes.status})`,
  )
  ok(blogHtml.includes('rel="canonical"'), '/blog canonical içeriyor')

  const betaRes = await fetch(`http://localhost:${PORT}/beta`)
  const betaHtml = await betaRes.text()
  ok(
    betaRes.status === 200 &&
      betaHtml.includes('afiet şimdi beta') &&
      betaHtml.includes('100 kişilik yer var'),
    `/beta 200 ve davet metni render oluyor (${betaRes.status})`,
  )
  ok(betaHtml.includes('rel="canonical"'), '/beta canonical içeriyor')

  const blogApi = await fetch(`http://localhost:${PORT}/api/blog/posts`)
  const blogApiBody = await blogApi.json().catch(() => null)
  ok(
    blogApi.status === 200 && Array.isArray(blogApiBody?.posts),
    `/api/blog/posts 200 + dizi (${blogApiBody?.posts?.length ?? '—'} yazı)`,
  )

  const missingPost = await fetch(`http://localhost:${PORT}/blog/olmayan-yazi-smoke`)
  ok(missingPost.status === 404, `bilinmeyen yazı gerçek 404 (${missingPost.status})`)

  const rssRes = await fetch(`http://localhost:${PORT}/blog/rss.xml`)
  const rss = await rssRes.text()
  ok(
    (rssRes.headers.get('content-type') || '').includes('xml') && rss.includes('<rss'),
    'blog RSS yayında ve XML',
  )
  ok(sitemap.includes('/blog'), 'sitemap /blog sayfasını içeriyor')
  ok(sitemap.includes('/beta'), 'sitemap /beta sayfasını içeriyor')

  const meta = await (
    await fetch(`http://localhost:${PORT}/api/seo/meta?path=/`)
  ).json()
  ok(meta.title?.includes('afiet') && meta.canonical, '/api/seo/meta tutarlı yanıt veriyor')

  const jsonldCount = (html.match(/application\/ld\+json/g) || []).length
  ok(jsonldCount >= 2, `JSON-LD blokları HTML'de (${jsonldCount})`)
  ok(html.includes('FAQPage'), 'FAQPage şeması HTML içinde')
  ok(html.includes('twitter:title'), 'twitter:title meta mevcut')

  // --- Afi'ye sor: SSS sözleşmesini bozmadan eklendi mi ---
  ok(html.includes('id="afiye-sor"'), 'Afi’ye sor bölümü prerender HTML içinde')
  ok(html.includes('ne merak ediyorsan sor'), 'Afi daveti prerender HTML içinde')
  ok((html.match(/<details/g) || []).length >= 3, 'SSS <details> öğeleri hâlâ HTML içinde')
  // Panel ileride Turnstile yükleyecek; sayfa açılışında YÜKLENMEMELİ.
  ok(
    !html.includes('challenges.cloudflare.com'),
    'Turnstile sayfa yüklemede yok (yalnız etkileşimde yüklenir)',
  )

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
  ok((await page.locator('#haber').count()) === 1, 'kapanış bölümü mevcut')
  ok(
    (await page.locator('#haber a[href="/beta"]').count()) >= 1,
    'kapanış bölümü beta sayfasına yönlendiriyor',
  )

  // --- Scroll reveal çalışıyor ---
  await page.locator('#haber').scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)
  const revealed = await page.locator('.reveal.is-in').count()
  ok(revealed > 0, `scroll reveal çalışıyor (${revealed} eleman)`)

  // --- Header CTA beta sayfasına götürüyor ---
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('navigation').getByRole('link', { name: 'Beta’ya katıl' }).first().click()
  await page.waitForURL('**/beta', { timeout: 10000 })
  ok(page.url().endsWith('/beta'), 'header CTA /beta sayfasına götürüyor')
  await page.goBack({ waitUntil: 'networkidle' })

  // --- Mobil menü: küçük ekranda bağlantılar ulaşılabilir olmalı ---
  await page.setViewportSize({ width: 380, height: 800 })
  await page.reload({ waitUntil: 'networkidle' })
  const menu = page.locator('header details.site-menu')
  ok((await menu.count()) === 1, 'mobil menü mevcut')
  ok(!(await page.locator('header details.site-menu div a').first().isVisible()),
    'menü kapalıyken bağlantılar gizli')
  await menu.locator('summary').click()
  ok(await page.locator('header details.site-menu').getByRole('link', { name: 'Blog' }).isVisible(),
    'menü açılınca Blog bağlantısı görünüyor')
  await page.locator('header details.site-menu').getByRole('link', { name: 'Blog' }).click()
  await page.waitForURL('**/blog', { timeout: 10000 })
  ok(page.url().includes('/blog'), 'mobil menüden Blog’a gidiliyor')
  ok(!(await page.locator('header details.site-menu[open]').count()),
    'yol değişince menü kapanıyor')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })

  let betaBody
  await page.route('**/api/beta/apply', async (route) => {
    if (route.request().method() === 'POST') {
      betaBody = route.request().postDataJSON()
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' })
      return
    }
    await route.continue()
  })

  await page.goto(`http://localhost:${PORT}/beta`, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { level: 1, name: "afiet şimdi beta'da." }).waitFor()
  ok(true, '/beta h1 görünür')
  ok((await page.locator('#beta-katil form').count()) === 1, '/beta formu görünür')
  ok((await page.getByText('iOS ve Android aynı anda').count()) > 0, '/beta platform başlangıcı görünür')
  ok((await page.getByText('100 kişi', { exact: true }).count()) > 0, '/beta kontenjanı görünür')

  await page.getByRole('link', { name: 'Sofrada yerini ayır' }).click()
  await page.waitForTimeout(700)
  const nearBetaForm = await page.evaluate(() => {
    const r = document.getElementById('beta-katil').getBoundingClientRect()
    return r.top > -50 && r.top < window.innerHeight
  })
  ok(nearBetaForm, 'beta CTA form bölümüne götürüyor')

  // Adım 1 — e-posta
  await page.getByPlaceholder('e-posta adresin').fill('beta-smoke@afiet.co')
  await page.locator('#beta-katil form').getByRole('button', { name: 'Devam' }).click()
  // Adım 2 — platform + hedef zorunlu
  await page.getByRole('button', { name: 'iPhone' }).click()
  await page.getByRole('button', { name: 'Daha çok enerji' }).click()
  await page.locator('#beta-katil form').getByRole('button', { name: 'Devam' }).click()
  // Adım 3 — uygulama seçimi + onay + gönder
  await page.getByRole('button', { name: 'FatSecret' }).click()
  await page.getByRole('checkbox').check()
  await page.locator('#beta-katil form').getByRole('button', { name: 'Sofrada yerini ayır' }).click()
  await page.getByText('Sofrada yerin hazır!').waitFor()
  ok(betaBody?.source === 'beta', 'beta formu source alanını beta gönderiyor')
  ok(betaBody?.platform === 'ios', 'beta formu platform (ios) gönderiyor')
  ok(betaBody?.consent === true, 'beta formu onay (consent) gönderiyor')
  ok(
    Array.isArray(betaBody?.goals) && betaBody.goals.includes('enerji'),
    'beta formu hedef seçimini gönderiyor',
  )
  ok(
    Array.isArray(betaBody?.appsNutrition) && betaBody.appsNutrition.includes('fatsecret'),
    'beta formu uygulama seçimini gönderiyor',
  )
  await page.reload({ waitUntil: 'networkidle' })

  // --- Afi'ye sor paneli: çip → akış → cevap ---
  // Beta testleri sayfayı /beta'ya götürdü; panel ana sayfada.
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' })
  const afiSection = page.locator('#afiye-sor')
  await afiSection.scrollIntoViewIfNeeded()
  ok((await afiSection.count()) === 1, 'Afi’ye sor bölümü sayfada')

  // Marka değişmezleri (afiet-brand/maskot/README.md): buhar HEP iki tel,
  // yüz hiç değişmez (iki göz + bir gülümseme). Kod artık buna dayanıyor.
  ok(
    (await page.locator('#afiye-sor .afi-stage .afi-steam').count()) === 2,
    'Afi maskotunda tam iki buhar teli var',
  )
  ok(
    (await page.locator('#afiye-sor .afi-stage svg g[stroke="#047857"] path').count()) === 3,
    'Afi’nin yüzü değişmedi (iki göz + gülümseme)',
  )

  await page.locator('#afi-soru').focus()
  ok(
    (await page.locator('#afiye-sor .afi-stage').getAttribute('data-mood')) === 'listening',
    'input odakta Afi “dinliyor” moduna geçiyor',
  )

  const chipsBefore = await page.locator('#afiye-sor [data-afi-chip]').count()
  await page.locator('#afiye-sor [data-afi-chip]').first().click()
  await page.waitForFunction(
    () => !document.querySelector('#afiye-sor [aria-busy="true"]'),
    null,
    { timeout: 25000 },
  )
  ok(
    (await page.locator('#afiye-sor li').count()) === 2,
    'soru ve cevap balonu sohbete eklendi',
  )
  ok(
    (await page.locator('#afiye-sor [data-afi-chip]').count()) === chipsBefore - 1,
    'kullanılan çip listeden düşüyor',
  )
  ok(
    (await afiSection.textContent())?.includes('kalori saydırmaz'),
    'Afi’nin cevabı ekrana akıyor',
  )

  ok(errors.length === 0, `konsol/sayfa hatası yok${errors.length ? `: ${errors[0]}` : ''}`)

  // --- JS'siz sözleşme: SSS JS olmadan da çalışır (FaqSection.vue docblock'u) ---
  const noJsCtx = await browser.newContext({ javaScriptEnabled: false })
  const noJsPage = await noJsCtx.newPage()
  await noJsPage.goto(`http://localhost:${PORT}/`)
  const noJsDetails = await noJsPage.locator('#sss details').count()
  ok(noJsDetails >= 3, `JS'siz SSS öğeleri var (${noJsDetails})`)
  await noJsPage.locator('#sss details summary').first().click()
  ok(
    await noJsPage.locator('#sss details[open]').first().isVisible(),
    "JS'siz <details> açılıyor",
  )
  ok((await noJsPage.locator('#afiye-sor').count()) === 1, "JS'siz sayfada Afi bölümü de var")
  await noJsCtx.close()

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
    await page.screenshot({ path: join(process.env.SHOT_DIR, 'beta-desktop-full.png'), fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await settle()
    await page.screenshot({ path: join(process.env.SHOT_DIR, 'beta-mobile-full.png'), fullPage: true })
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

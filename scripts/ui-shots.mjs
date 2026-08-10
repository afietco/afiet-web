/**
 * UI gözden geçirme görüntüleri (`node scripts/ui-shots.mjs`, çıktı .shots-ui/).
 * Vitrin sayfalarını masaüstü/mobil kırılımlarda çeker; tasarım turlarında
 * onaya sunmak içindir. Sistem Chrome'u ile koşar (smoke.mjs ile aynı yol),
 * dev sunucunun 3210 portunda açık olmasını bekler (BASE_URL ile değişir).
 *
 * Blog bölümü yerel dev veritabanında boş olabileceğinden /api/blog/posts
 * isteği CANLI prod API'sinin (herkese açık uç) cevabıyla doldurulur; hiçbir
 * veritabanına yazılmaz. Cevap İSTENEN DİLE göre verilir: tek liste dolduran
 * bir sürüm /en ekranına Türkçe yazılar basar ve görüntü yalan söyler.
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL || 'http://localhost:3210'
const OUT = process.env.SHOT_DIR || '.shots-ui'
const CHROME =
  process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

mkdirSync(OUT, { recursive: true })

const fetchPosts = (lang) =>
  fetch(`https://afiet.co/api/blog/posts?lang=${lang}`)
    .then((r) => (r.ok ? r.json() : { posts: [] }))
    .catch(() => ({ posts: [] }))
const [livePosts, livePostsEn] = await Promise.all([fetchPosts('tr'), fetchPosts('en')])

const browser = await chromium.launch({ executablePath: CHROME, headless: true })

async function shot(name, path, { width = 1440, height = 900, full = true, before } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.route('**/api/blog/posts**', (route) => {
    const lang = new URL(route.request().url()).searchParams.get('lang')
    route.fulfill({ json: lang === 'en' ? livePostsEn : livePosts, contentType: 'application/json' })
  })
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  // reveal animasyonlari: support-shots.mjs ile ayni desen, IO'ya zaman tani
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += innerHeight * 0.7) {
      scrollTo({ top: y, behavior: 'instant' })
      await new Promise((r) => setTimeout(r, 180))
    }
    scrollTo({ top: 0, behavior: 'instant' })
  })
  await page.waitForTimeout(900)
  if (before) await before(page)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
  await ctx.close()
  console.log(`✓ ${name}`)
}

await shot('01-ana-masaustu', '/')
await shot('02-ana-mobil', '/', { width: 390, height: 844 })
await shot('03-hero-mock', '/', { full: false })
await shot('04-iletisim-masaustu', '/iletisim')
await shot('05-iletisim-dolu', '/iletisim', {
  full: true,
  before: async (page) => {
    await page.click('button[aria-pressed]:has-text("Öneri")')
    await page.fill('#kart-mesaj', 'Sofra kesesi fikrine bayıldım. Bir de haftalık özet olsa?')
    await page.fill('#kart-kimden', 'Berk')
    await page.fill('#kart-eposta', 'berk@ornek.co')
  },
})
await shot('06-iletisim-mobil', '/iletisim', { width: 390, height: 844 })
await shot('07-navbar-tablet', '/', { width: 768, height: 500, full: false })
await shot('08-blog-yazi-sonu', `/blog/${livePosts.posts?.[0]?.slug ?? ''}`)
await shot('09-en-ana-masaustu', '/en')
await shot('10-en-ana-mobil', '/en', { width: 390, height: 844 })

await browser.close()
console.log(`Görseller: ${OUT}/`)

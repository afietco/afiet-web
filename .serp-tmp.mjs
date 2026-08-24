import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: false })
const ctx = await b.newContext({ locale: 'tr-TR', viewport: { width: 1280, height: 900 } })
const p = await ctx.newPage()
for (const q of ['afiet.co', 'afiet uygulaması', 'afiet sayma dengele']) {
  try {
    await p.goto('https://search.brave.com/search?q=' + encodeURIComponent(q), { waitUntil: 'domcontentloaded', timeout: 30000 })
    await p.waitForTimeout(4000)
    const links = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map(a=>a.href).filter(h=>h.includes('afiet')))])
    const t = await p.evaluate(() => document.body.innerText.slice(0, 600).replace(/\n+/g,' | '))
    console.log('\n##### BRAVE "'+q+'"\nlinkler: '+JSON.stringify(links)+'\nmetin: '+t)
  } catch (e) { console.log('\n##### BRAVE "'+q+'" HATA: '+e.message) }
}
await b.close()

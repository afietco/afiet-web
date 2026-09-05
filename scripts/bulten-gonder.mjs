/**
 * Bülten gönderimi - markdown dosyasını onaylı abonelere Resend API ile yollar.
 * Dış servis paneli YOK (kullanıcı kararı, 5 Ağu 2026): liste Neon'daki
 * `bulten_subscribers` tablosudur, gönderim bu script'tir.
 *
 * Kullanım:
 *   node scripts/bulten-gonder.mjs content/bulten/<dosya>.md            # TR onaylılara
 *   node scripts/bulten-gonder.mjs content/bulten/<dosya>.md --test a@b # tek adrese prova
 *   ... [--lang en]  yalnız İngilizce abonelere (lang kolonu; çıkış linki ve
 *                    alt bilgi de İngilizce olur). Varsayılan tr: TR gönderimi
 *                    İngilizce aboneye ASLA gitmez.
 *   ... [--yes]  onay sorusunu atlar
 *
 * Frontmatter (--- blokları):
 *   subject: mail konusu (zorunlu)
 *
 * DB: .env'deki NUXT_DATABASE_URL (ya da ortam değişkeni). Script hedef Neon
 * host'unu ve alıcı sayısını gösterip onay ister - yanlış ortama/koca listeye
 * kazara göndermeyi engeller. Resend anahtarı: NUXT_RESEND_API_KEY.
 * md dosyası repoya commit'lenir (arşiv); gönderilen maili o temsil eder.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import postgres from 'postgres'
import MarkdownIt from 'markdown-it'

const root = fileURLToPath(new URL('..', import.meta.url))
const SITE = 'https://afiet.co'
const FROM = 'afiet <bulten@posta.afiet.co>'
const BATCH = 100 // Resend /emails/batch üst sınırı

const args = process.argv.slice(2)
const yes = args.includes('--yes')
const testIdx = args.indexOf('--test')
const testTo = testIdx !== -1 ? args[testIdx + 1] : null
const langIdx = args.indexOf('--lang')
const lang = langIdx !== -1 ? args[langIdx + 1] : 'tr'
const en = lang === 'en'
const file = args.find((a) => a.endsWith('.md'))

const die = (msg) => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

function envValue(name) {
  if (process.env[name]) return process.env[name].trim()
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return ''
  const m = readFileSync(envPath, 'utf8').match(
    new RegExp(`^${name}=["']?([^"'\\n]+)["']?\\s*$`, 'm'),
  )
  return m ? m[1].trim() : ''
}

async function confirm(question) {
  if (yes) return true
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await rl.question(`${question} (e/h) `)).trim().toLowerCase()
  rl.close()
  return answer === 'e' || answer === 'evet'
}

// ── Girdi ────────────────────────────────────────────────────────────────────
if (lang !== 'tr' && lang !== 'en') die('--lang yalnız tr ya da en olabilir.')
if (!file) die('Kullanım: node scripts/bulten-gonder.mjs content/bulten/<dosya>.md')
const fullPath = join(root, file)
if (!existsSync(fullPath)) die(`Dosya yok: ${file}`)

const raw = readFileSync(fullPath, 'utf8')
const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
if (!fmMatch) die('Frontmatter yok (--- blokları).')
const fm = Object.fromEntries(
  fmMatch[1]
    .split('\n')
    .map((l) => l.match(/^(\w+):\s*(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]),
)
const bodyMd = fmMatch[2].trim()
const subject = fm.subject || ''
if (!subject) die('Frontmatter "subject" zorunlu.')
if (!bodyMd) die('Gövde boş.')
if (subject.startsWith('TODO') || bodyMd.startsWith('TODO')) die('TODO kalmış; bülten yarım.')

// ── Gövde: markdown → e-posta HTML'i ────────────────────────────────────────
// html:false: ham HTML escape edilir (blog/destek ile aynı güvenlik kararı).
const md = new MarkdownIt({ html: false, linkify: true })
const bodyHtml = md.render(bodyMd)

/* Dil bazlı sabitler: tagline, alt bilgi ve çıkış inişi abonenin dilinde. */
const TAGLINE = en ? 'Stop counting. Start balancing.' : 'Sayma, dengele.'
const FOOTER_NOTE = en
  ? 'You received this email because you subscribed to the afiet newsletter.'
  : 'Bu maili afiet bültenine abone olduğun için aldın.'
const UNSUB_LABEL = en ? 'One-click unsubscribe' : 'Tek tıkla çık'
const UNSUB_PATH = en ? '/en/newsletter/leave' : '/bulten/cik'

/** Tek kolonlu, inline stilli, koyu moddan bağımsız sade şablon. */
function emailHtml(unsubUrl) {
  return `<!doctype html>
<html lang="${lang}">
<body style="margin:0;padding:0;background:#fdfaf3">
  <div style="max-width:560px;margin:0 auto;padding:28px 20px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#322f2a;font-size:16px;line-height:1.65">
    <p style="margin:0 0 24px">
      <span style="font-size:22px;font-weight:800;color:#059669">afiet</span>
      <span style="color:#97907f;font-size:13px;font-weight:700"> · ${TAGLINE}</span>
    </p>
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #ece4d4;margin:32px 0 16px">
    <p style="color:#97907f;font-size:13px;margin:0">
      ${FOOTER_NOTE}
      <a href="${unsubUrl}" style="color:#97907f">${UNSUB_LABEL}</a> ·
      <a href="${SITE}" style="color:#97907f">afiet.co</a>
    </p>
  </div>
</body>
</html>`
}

function emailText(unsubUrl) {
  return en
    ? `${bodyMd}\n\n---\n${FOOTER_NOTE}\nUnsubscribe: ${unsubUrl}\n${SITE}`
    : `${bodyMd}\n\n---\n${FOOTER_NOTE}\nÇıkmak için: ${unsubUrl}\n${SITE}`
}

function payload(to, token) {
  const unsubUrl = `${SITE}${UNSUB_PATH}?token=${token}`
  return {
    from: FROM,
    to: [to],
    subject,
    html: emailHtml(unsubUrl),
    text: emailText(unsubUrl),
    headers: {
      // RFC 8058 tek tık çıkış: istemciler API ucuna gövdesiz POST atar.
      'List-Unsubscribe': `<${SITE}/api/bulten/cik?token=${token}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  }
}

// ── Gönderim ─────────────────────────────────────────────────────────────────
const apiKey = envValue('NUXT_RESEND_API_KEY')
if (!apiKey) die('NUXT_RESEND_API_KEY yok (.env ya da ortam değişkeni).')

async function send(items) {
  const res = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  })
  if (!res.ok) die(`Resend ${res.status}: ${await res.text()}`)
}

if (testTo) {
  if (!(await confirm(`PROVA: "${subject}" yalnız ${testTo} adresine gidecek. Onay?`))) die('Vazgeçildi.')
  await send([payload(testTo, 'test-token')])
  console.log(`✓ Prova gönderildi: ${testTo}`)
  process.exit(0)
}

const dbUrl = envValue('NUXT_DATABASE_URL')
if (!dbUrl) die('NUXT_DATABASE_URL yok.')
const host = new URL(dbUrl).hostname
const sql = postgres(dbUrl, { prepare: false, onnotice: () => {} })

/* lang kolonu abone.post.ts'in ALTER'ıyla gelir; hiç EN abone yazılmamış eski
   DB'de kolon olmayabilir - COALESCE yerine kolonun varlığını yoklamak yerine
   sunucuyla aynı ensure ALTER'ını koşmak en ucuzu. */
await sql`ALTER TABLE bulten_subscribers ADD COLUMN IF NOT EXISTS lang text NOT NULL DEFAULT 'tr'`
const subs = await sql`
  SELECT email, token FROM bulten_subscribers
  WHERE status = 'onayli' AND lang = ${lang}
  ORDER BY id
`
if (subs.length === 0) die(`Onaylı ${lang} abonesi yok; gönderilecek kimse bulunamadı.`)

console.log(`Konu   : ${subject}`)
console.log(`Sunucu : ${host}`)
console.log(`Dil    : ${lang}`)
console.log(`Alıcı  : ${subs.length} onaylı abone`)
if (!(await confirm('Gönderilsin mi?'))) die('Vazgeçildi.')

for (let i = 0; i < subs.length; i += BATCH) {
  const chunk = subs.slice(i, i + BATCH)
  await send(chunk.map((s) => payload(s.email, s.token)))
  console.log(`  → ${Math.min(i + BATCH, subs.length)}/${subs.length}`)
}
console.log('✓ Bülten yolda. Sofranıza afiyet.')

// postgres.js bir bağlantı HAVUZU tutar ve havuz açıkken olay döngüsü boşalmaz:
// `neon()` durumsuz HTTP olduğu için betik kendiliğinden biterdi, bu sürücüde
// bitmez. Kapatmadan çıkma - script sonsuza kadar asılı kalır.
await sql.end()

/**
 * Sürüm notu taslağı - mobil CHANGELOG'un bir sürümünü `/yenilikler`
 * sayfasının markdown biçimine çevirir.
 *
 * Kaynak `afiet-mobile/apps/mobile/CHANGELOG.md`; maddeler zaten kullanıcı
 * dilinde yazıldığı için burada YENİDEN YAZILMAZ, yalnız gruplanıp taşınır.
 * Elle yapılacak tek iş taslağın tepesindeki giriş paragrafı ile başlık ve
 * özet satırlarıdır; script onları `TODO` olarak bırakır ve doldurulmadan
 * dosyayı yayına uygun saymaz (`npm run yenilikler:kontrol`).
 *
 * Kullanım:
 *   node scripts/surum-notu-taslagi.mjs 0.10.1
 *   node scripts/surum-notu-taslagi.mjs 0.10.1 --force        (üstüne yaz)
 *   node scripts/surum-notu-taslagi.mjs --changelog <yol> 0.10.1
 *
 * Mobil repo yolu varsayılan olarak kardeş dizindir (~/afiet.co/afiet-mobile).
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const DEFAULT_CHANGELOG = join(root, '..', 'afiet-mobile', 'apps', 'mobile', 'CHANGELOG.md')
const OUT_DIR = join(root, 'content', 'yenilikler')

const die = (msg) => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

const args = process.argv.slice(2)
const force = args.includes('--force')
const cIdx = args.indexOf('--changelog')
const changelogPath = cIdx !== -1 ? args[cIdx + 1] : DEFAULT_CHANGELOG
const version = args.find((a) => /^\d+\.\d+\.\d+$/.test(a))

if (!version) die('Sürüm ver: node scripts/surum-notu-taslagi.mjs 0.10.1')
if (!existsSync(changelogPath)) die(`CHANGELOG bulunamadı: ${changelogPath}`)

/**
 * Maddenin başındaki emoji hangi bölüme düştüğünü söyler. CHANGELOG'un
 * sözleşmesi bu üç emojidir (afiet-mobile/CLAUDE.md > Release ve changelog);
 * tanımadığımız bir emoji sessizce yutulmaz, "Diğer"e düşer ve gözden
 * geçirende bir soru bırakır.
 */
const GROUPS = [
  { emoji: '✨', heading: 'Yenilikler' },
  { emoji: '🔧', heading: 'İyileştirmeler' },
  { emoji: '🐛', heading: 'Düzeltmeler' },
]

/** `## [0.10.0] — 2026-08-01` başlığı; ayraç em dash, tire ya da en dash olabilir. */
const HEADING_RE = /^## \[([^\]]+)\][ \t]*[—–-]?[ \t]*(\d{4}-\d{2}-\d{2})?/

function sectionFor(raw, wanted) {
  const lines = raw.split('\n')
  let start = -1
  let date = ''
  for (let i = 0; i < lines.length; i++) {
    const m = HEADING_RE.exec(lines[i])
    if (!m) continue
    if (start !== -1) return { body: lines.slice(start, i).join('\n'), date }
    if (m[1].trim() === wanted) {
      start = i + 1
      date = m[2] ?? ''
    }
  }
  if (start === -1) return null
  return { body: lines.slice(start).join('\n'), date }
}

const parsed = sectionFor(readFileSync(changelogPath, 'utf8'), version)
if (!parsed) die(`CHANGELOG'da [${version}] bölümü yok.`)
if (!parsed.date) die(`[${version}] başlığında tarih yok; önce CHANGELOG'u düzelt.`)

/**
 * Maddeler tek satırdır ama uzun olduğu için sarılmış olabilir; bir sonraki
 * "- " işaretine kadar okunup tek satıra düzleştirilir.
 */
function bullets(body) {
  const out = []
  for (const line of body.split('\n')) {
    const started = /^\s*-\s+/.test(line)
    if (started) out.push(line.replace(/^\s*-\s+/, '').trim())
    else if (out.length && line.trim()) out[out.length - 1] += ` ${line.trim()}`
  }
  return out.filter(Boolean)
}

const grouped = new Map(GROUPS.map((g) => [g.heading, []]))
grouped.set('Diğer', [])

for (const item of bullets(parsed.body)) {
  const group = GROUPS.find((g) => item.startsWith(g.emoji))
  const heading = group ? group.heading : 'Diğer'
  grouped.get(heading).push(group ? item.slice(group.emoji.length).trim() : item)
}

const total = [...grouped.values()].reduce((n, list) => n + list.length, 0)
if (!total) die(`[${version}] bölümünde madde yok.`)

const sections = []
for (const [heading, items] of grouped) {
  if (!items.length) continue
  sections.push(`## ${heading}\n\n${items.map((t) => `- ${t}`).join('\n')}`)
}

const md =
  [
    '---',
    `version: "${version}"`,
    `date: ${parsed.date}`,
    'title: "TODO: bu sürümü tek cümlede anlatan başlık"',
    'summary: "TODO: iki cümlelik özet; arama sonucunda ve listede bu görünür."',
    '---',
    '',
    'TODO: giriş paragrafı. Sürümün ne getirdiğini sofradaki dille anlat;',
    'aşağıdaki maddeler zaten ayrıntıyı veriyor.',
    '',
  ].join('\n') +
  '\n' +
  sections.join('\n\n') +
  '\n'

mkdirSync(OUT_DIR, { recursive: true })
const outPath = join(OUT_DIR, `${version}.md`)
if (existsSync(outPath) && !force) die(`${outPath} zaten var. Üstüne yazmak için --force.`)
writeFileSync(outPath, md, 'utf8')

const counts = [...grouped]
  .filter(([, items]) => items.length)
  .map(([heading, items]) => `${items.length} ${heading.toLocaleLowerCase('tr-TR')}`)
  .join(', ')
console.log(`✓ ${outPath}`)
console.log(`  ${version} · ${parsed.date} · ${counts}`)
console.log('  Sıradaki: dosyadaki üç TODO satırını doldur.')
if (grouped.get('Diğer').length) {
  console.log('  ⚠ "Diğer" bölümü var: tanınmayan emoji ile başlayan madde(ler) bulundu.')
}

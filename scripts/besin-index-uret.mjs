/**
 * Porsiyon çeviricinin besin dizinini üretir.
 *
 * Katalog afiet-mobile'daki `@afiet/core > SEED_FOODS` içinde ve 1 MB'ın
 * üzerinde; tarayıcıya olduğu gibi gönderilemez. Bu script yalnız ÇEVİRİ İÇİN
 * gereken alanları alıp `public/veri/besinler.json` üretir (açıklama metinleri
 * ve çeviriyle ilgisi olmayan alanlar atılır).
 *
 * Kullanım:
 *   node scripts/besin-index-uret.mjs <afiet-mobile-yolu>
 *
 * Katalog büyüdüğünde (yeni besin eklendiğinde) yeniden çalıştır ve çıktıyı
 * commit'le. Dizin ile katalog arasındaki sapmayı bir test yakalamaz; bu
 * bilinçli, çünkü dizin türetilmiş bir görüntüdür, ikinci bir gerçek değildir.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const mobil = process.argv[2]
if (!mobil) {
  console.error('Kullanım: node scripts/besin-index-uret.mjs <afiet-mobile-yolu>')
  process.exit(1)
}

const core = join(mobil, 'packages/core/src')
const tmp = join(root, '.besin-tmp')
mkdirSync(tmp, { recursive: true })

writeFileSync(
  join(tmp, 'giris.ts'),
  `import { SEED_FOODS } from '${join(core, 'foods')}'
const ince = SEED_FOODS.map((f) => ({
  a: f.name,
  e: f.emoji ?? '',
  o: f.measure,
  g: f.gramPerMeasure ?? null,
  gr: f.groups,
  m: f.defaultQuantity ?? 1,
  k: f.category ?? '',
  d: f.dietTags ?? [],
  mk: f.macros ? [f.macros.kcal, f.macros.protein, f.macros.carb, f.macros.fat] : null,
  l: f.fiberG ?? 0,
  t: f.aliases ?? [],
}))
console.log(JSON.stringify({ uretim: 'scripts/besin-index-uret.mjs', sayi: ince.length, besinler: ince }))
`,
)

execFileSync(join(root, 'node_modules/.bin/esbuild'), [
  '--bundle', join(tmp, 'giris.ts'),
  '--format=esm', '--platform=node',
  `--outfile=${join(tmp, 'giris.mjs')}`,
  '--log-level=error',
])

const json = execFileSync('node', [join(tmp, 'giris.mjs')], { maxBuffer: 64 * 1024 * 1024 }).toString()
const hedefDizin = join(root, 'public/veri')
mkdirSync(hedefDizin, { recursive: true })
const hedef = join(hedefDizin, 'besinler.json')
writeFileSync(hedef, json)
rmSync(tmp, { recursive: true, force: true })

const { sayi } = JSON.parse(json)
console.log(`${sayi} besin → public/veri/besinler.json (${(json.length / 1024).toFixed(0)} KB)`)

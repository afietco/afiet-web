/**
 * Blog yayınlama — markdown dosyasını Neon'daki blog_posts tablosuna basar.
 * Deploy GEREKMEZ: yazı ISR + bellek cache nedeniyle ~2 dk içinde canlıdır
 * (sitemap/RSS ≤ 5 dk). Panel prompt'ları bu script'i çağırtır.
 *
 * Kullanım:
 *   node scripts/publish-post.mjs content/posts/<slug>.md [--yes]
 *   node scripts/publish-post.mjs --unpublish <slug> [--yes]
 *
 * Frontmatter (--- blokları):
 *   slug, title, description zorunlu; tags: [a, b] · item_id · cover_url ·
 *   published_at (boşsa ilk yayında now() basılır, güncellemede korunur).
 *
 * DB: .env'deki NUXT_DATABASE_URL (ya da ortam değişkeni). Script hedef Neon
 * host'unu gösterip onay ister — yanlış ortama yazmayı engeller.
 * md dosyası repoya commit'lenir (yedek); RUNTIME KAYNAĞI VERİTABANIDIR.
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { neon } from '@neondatabase/serverless'

const root = fileURLToPath(new URL('..', import.meta.url))
const SITE = 'https://afiet.co'
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

const args = process.argv.slice(2)
const yes = args.includes('--yes')
const unpublishIdx = args.indexOf('--unpublish')
const die = (msg) => {
  console.error(`✗ ${msg}`)
  process.exit(1)
}

// ── DB bağlantısı (.env — dotenv bağımlılığı yok) ────────────────────────────
function databaseUrl() {
  if (process.env.NUXT_DATABASE_URL) return process.env.NUXT_DATABASE_URL.trim()
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) die('.env yok ve NUXT_DATABASE_URL tanımsız.')
  const m = readFileSync(envPath, 'utf8').match(/^NUXT_DATABASE_URL=["']?([^"'\n]+)["']?\s*$/m)
  if (!m) die('.env içinde NUXT_DATABASE_URL bulunamadı.')
  return m[1].trim()
}

async function confirm(question) {
  if (yes) return true
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await rl.question(`${question} (e/h) `)).trim().toLowerCase()
  rl.close()
  return answer === 'e' || answer === 'evet'
}

// contentStore.ts ile SENKRON tut — aynı tablolar, aynı DDL.
async function ensureTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS content_items (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      channel text NOT NULL CHECK (channel IN ('blog','instagram','x')),
      title text NOT NULL,
      status text NOT NULL DEFAULT 'fikir'
        CHECK (status IN ('fikir','planlandi','uretimde','yayinda','arsiv')),
      slug text,
      brief jsonb NOT NULL DEFAULT '{}'::jsonb,
      planned_date date,
      published_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS blog_posts (
      slug text PRIMARY KEY,
      title text NOT NULL,
      description text NOT NULL DEFAULT '',
      content_md text NOT NULL,
      tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      cover_url text,
      status text NOT NULL DEFAULT 'taslak' CHECK (status IN ('taslak','yayinda')),
      reading_minutes int,
      item_id bigint REFERENCES content_items(id) ON DELETE SET NULL,
      published_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
}

// ── Frontmatter ──────────────────────────────────────────────────────────────
function parseFrontmatter(raw, file) {
  if (!raw.startsWith('---')) die(`${file}: frontmatter yok (--- ile başlamalı).`)
  const end = raw.indexOf('\n---', 3)
  if (end === -1) die(`${file}: frontmatter kapanışı (---) bulunamadı.`)
  const head = raw.slice(raw.indexOf('\n') + 1, end)
  const body = raw.slice(raw.indexOf('\n', end + 1) + 1).trim()

  const fm = {}
  for (const line of head.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    fm[key] = value
  }

  const tags = (fm.tags ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((t) => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)

  return {
    slug: fm.slug ?? '',
    title: fm.title ?? '',
    description: fm.description ?? '',
    tags,
    itemId: fm.item_id && /^\d+$/.test(fm.item_id) ? Number(fm.item_id) : null,
    coverUrl: fm.cover_url || null,
    publishedAt: fm.published_at || null,
    body,
  }
}

const readingMinutes = (src) =>
  Math.max(1, Math.round(src.trim().split(/\s+/).filter(Boolean).length / 200))

// ── Ana akış ─────────────────────────────────────────────────────────────────
const url = databaseUrl()
const host = new URL(url).hostname
const sql = neon(url)
const [{ db }] = await sql`SELECT current_database() AS db`
console.log(`Hedef Neon: ${host} · veritabanı: ${db}`)

if (unpublishIdx !== -1) {
  // ── Yayından kaldır ──
  const slug = args[unpublishIdx + 1]
  if (!slug || !SLUG_RE.test(slug)) die('--unpublish <slug> gerekli.')
  await ensureTables(sql)
  const rows = await sql`SELECT slug, title, item_id FROM blog_posts WHERE slug = ${slug}`
  if (!rows.length) die(`'${slug}' bulunamadı.`)
  console.log(`Yayından kaldırılacak: ${rows[0].title} (${SITE}/blog/${slug})`)
  if (!(await confirm('Devam edilsin mi?'))) die('Vazgeçildi.')
  await sql`UPDATE blog_posts SET status = 'taslak', updated_at = now() WHERE slug = ${slug}`
  if (rows[0].item_id) {
    await sql`
      UPDATE content_items SET status = 'uretimde', updated_at = now()
      WHERE id = ${rows[0].item_id} AND status = 'yayinda'
    `
  }
  console.log(`✓ '${slug}' taslağa çekildi (sayfa ≤ ~2 dk içinde 404 olur; sitemap/RSS ≤ 5 dk).`)
  process.exit(0)
}

// ── Yayınla ──
const file = args.find((a) => !a.startsWith('--'))
if (!file) die('Kullanım: node scripts/publish-post.mjs content/posts/<slug>.md [--yes]')
const path = join(root, file)
if (!existsSync(path)) die(`Dosya yok: ${file}`)

const post = parseFrontmatter(readFileSync(path, 'utf8'), file)
if (!post.slug || !SLUG_RE.test(post.slug) || post.slug.length > 120)
  die('Geçersiz slug (küçük harf-rakam-tire, ≤120).')
if (!post.title || post.title.length > 300) die('title zorunlu (≤300).')
if (!post.description) die('description zorunlu.')
if (!post.body) die('Gövde boş.')
if (post.publishedAt && Number.isNaN(new Date(post.publishedAt).getTime()))
  die('published_at geçersiz tarih.')

const minutes = readingMinutes(post.body)
const words = post.body.trim().split(/\s+/).length
if (post.description.length < 140 || post.description.length > 160)
  console.log(`⚠ description ${post.description.length} karakter (ideal 140–160) — yine de yayınlanabilir.`)

await ensureTables(sql)
const existing = await sql`SELECT slug, status FROM blog_posts WHERE slug = ${post.slug}`
const mode = existing.length ? `GÜNCELLEME (mevcut: ${existing[0].status})` : 'YENİ YAZI'

console.log('─'.repeat(60))
console.log(`${mode}  →  ${SITE}/blog/${post.slug}`)
console.log(`başlık      : ${post.title}`)
console.log(`açıklama    : ${post.description.slice(0, 80)}… (${post.description.length}ch)`)
console.log(`etiketler   : ${post.tags.join(', ') || '—'}`)
console.log(`gövde       : ${words} kelime · ~${minutes} dk okuma`)
console.log(`panel item  : ${post.itemId ?? '— (bağlı değil)'}`)
console.log('─'.repeat(60))
if (!(await confirm('Yayınlansın mı?'))) die('Vazgeçildi.')

await sql`
  INSERT INTO blog_posts
    (slug, title, description, content_md, tags, cover_url, status, reading_minutes, item_id, published_at)
  VALUES
    (${post.slug}, ${post.title}, ${post.description}, ${post.body},
     ${JSON.stringify(post.tags)}::jsonb, ${post.coverUrl}, 'yayinda', ${minutes},
     ${post.itemId}, COALESCE(${post.publishedAt}::timestamptz, now()))
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    content_md = EXCLUDED.content_md,
    tags = EXCLUDED.tags,
    cover_url = EXCLUDED.cover_url,
    status = 'yayinda',
    reading_minutes = EXCLUDED.reading_minutes,
    item_id = EXCLUDED.item_id,
    published_at = COALESCE(${post.publishedAt}::timestamptz, blog_posts.published_at, now()),
    updated_at = now()
`

if (post.itemId) {
  const updated = await sql`
    UPDATE content_items SET
      status = 'yayinda',
      published_url = ${`${SITE}/blog/${post.slug}`},
      slug = ${post.slug},
      updated_at = now()
    WHERE id = ${post.itemId}
    RETURNING id
  `
  console.log(
    updated.length
      ? `✓ Panel içeriği #${post.itemId} "yayında" yapıldı.`
      : `⚠ Panel içeriği #${post.itemId} bulunamadı — panelde elle güncelle.`,
  )
}

console.log(`✓ Yayında: ${SITE}/blog/${post.slug}`)
console.log('  görünürlük: sayfa ≤ ~2 dk (bellek cache 60 sn + ISR 60 sn) · sitemap/RSS ≤ 5 dk')
console.log('  hatırlatma: md dosyasını commit\'le — yedek dosyada, runtime kaynağı DB\'de.')

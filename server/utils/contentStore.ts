import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'
import type {
  AdminContentPayload,
  BlogPost,
  BlogPostSummary,
  ContentBrief,
  ContentItem,
  ContentItemInput,
  ContentMetric,
  ContentMetricInput,
} from './contentTypes'
import { emptyBrief } from './contentTypes'

/**
 * İçerik planı + blog verisi: SEO/waitlist ile aynı Neon'da, landing'e ait
 * kendi kendini kuran tablolar (seoStore deseni; backend'in golang-migrate
 * şemasından bağımsız). DB yoksa admin GET boş listelerle `dbConnected:false`
 * döner, yazma uçları 503 verir — smoke/CI ortamı DB'siz de yeşildir.
 *
 * Panel uçları taze okur (yazma sonrası dönen payload panelin tek gerçeği);
 * 60 sn bellek cache'i yalnız yayındaki blog yazılarına uygulanır (Faz C'de
 * /blog sayfaları ve sitemap bunu okuyacak).
 */

type Sql = NeonQueryFunction<false, false>

const POSTS_CACHE_TTL_MS = 60_000
let postsCache: { at: number; posts: BlogPost[] } | null = null
let ensured = false

function sqlClient(event: H3Event): Sql | null {
  const url = useRuntimeConfig(event).databaseUrl
  return url ? neon(url) : null
}

/** Yazma uçları için: DB yoksa 503, varsa tabloları garanti edip istemci döner. */
export async function requireContentDb(event: H3Event): Promise<Sql> {
  const sql = sqlClient(event)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })
  await ensureContentTables(sql)
  return sql
}

export async function ensureContentTables(sql: Sql) {
  if (ensured) return
  // Sıra önemli: FK'ler content_items'a bakar.
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
  await sql`
    CREATE TABLE IF NOT EXISTS content_metrics (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      item_id bigint NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
      metric_date date NOT NULL,
      views int NOT NULL DEFAULT 0,
      likes int NOT NULL DEFAULT 0,
      comments int NOT NULL DEFAULT 0,
      shares int NOT NULL DEFAULT 0,
      saves int NOT NULL DEFAULT 0,
      clicks int NOT NULL DEFAULT 0,
      notes text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (item_id, metric_date)
    )
  `
  ensured = true
}

export function invalidateContentCache() {
  // Şimdilik yalnız blog okuma cache'i; içerik planı uçları hep taze okur.
  // (Sayfa HTML/ISR temizliği Faz C'de blog yayınına bağlanacak.)
  postsCache = null
}

// ── Satır → tip dönüştürücüler ───────────────────────────────────────────────
type Row = Record<string, unknown>

const toIso = (v: unknown): string => {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(String(v))
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}
const toIsoOrNull = (v: unknown): string | null => (v ? toIso(v) || null : null)
/**
 * DATE kolonu → 'YYYY-MM-DD'. Sürücü Date nesnesi döndürür (yerel gece
 * yarısı) — toISOString() TZ yüzünden günü kaydırır, yerel alanlardan kur.
 */
const toDateStr = (v: unknown): string | null => {
  if (!v) return null
  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`
  }
  return String(v).slice(0, 10)
}

function readStrArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

/** jsonb brief'i tam şekle oturt — eksik alanlar boş, fazlalıklar atılır. */
function readBrief(v: unknown): ContentBrief {
  const src = (typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {}) as Row
  const base = emptyBrief()
  return {
    keywords: readStrArr(src.keywords),
    audience: typeof src.audience === 'string' ? src.audience : base.audience,
    angle: typeof src.angle === 'string' ? src.angle : base.angle,
    tone: typeof src.tone === 'string' ? src.tone : base.tone,
    outline: readStrArr(src.outline),
    internalLinks: readStrArr(src.internalLinks),
    cta: typeof src.cta === 'string' ? src.cta : base.cta,
    sources: readStrArr(src.sources),
    notes: typeof src.notes === 'string' ? src.notes : base.notes,
  }
}

function mapItem(r: Row): ContentItem {
  return {
    id: Number(r.id),
    channel: r.channel as ContentItem['channel'],
    title: String(r.title),
    status: r.status as ContentItem['status'],
    slug: (r.slug as string | null) ?? null,
    brief: readBrief(r.brief),
    plannedDate: toDateStr(r.planned_date),
    publishedUrl: (r.published_url as string | null) ?? null,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  }
}

function mapMetric(r: Row): ContentMetric {
  return {
    id: Number(r.id),
    itemId: Number(r.item_id),
    metricDate: toDateStr(r.metric_date) ?? '',
    views: Number(r.views),
    likes: Number(r.likes),
    comments: Number(r.comments),
    shares: Number(r.shares),
    saves: Number(r.saves),
    clicks: Number(r.clicks),
    notes: String(r.notes ?? ''),
  }
}

function mapPostSummary(r: Row): BlogPostSummary {
  return {
    slug: String(r.slug),
    title: String(r.title),
    status: r.status as BlogPostSummary['status'],
    publishedAt: toIsoOrNull(r.published_at),
    readingMinutes: r.reading_minutes === null || r.reading_minutes === undefined ? null : Number(r.reading_minutes),
    itemId: r.item_id === null || r.item_id === undefined ? null : Number(r.item_id),
    updatedAt: toIso(r.updated_at),
  }
}

function mapPost(r: Row): BlogPost {
  return {
    ...mapPostSummary(r),
    description: String(r.description ?? ''),
    contentMd: String(r.content_md ?? ''),
    tags: readStrArr(r.tags),
    coverUrl: (r.cover_url as string | null) ?? null,
    createdAt: toIso(r.created_at),
  }
}

// ── İçerik planı ─────────────────────────────────────────────────────────────
export async function listContentItems(sql: Sql): Promise<ContentItem[]> {
  const rows = await sql`SELECT * FROM content_items ORDER BY id DESC`
  return rows.map(mapItem)
}

/** id verilmişse günceller (yoksa 404), verilmemişse ekler. */
export async function upsertContentItem(sql: Sql, input: ContentItemInput): Promise<void> {
  const brief = JSON.stringify(input.brief)
  if (input.id) {
    const rows = await sql`
      UPDATE content_items SET
        channel = ${input.channel},
        title = ${input.title},
        status = ${input.status},
        slug = ${input.slug},
        brief = ${brief}::jsonb,
        planned_date = ${input.plannedDate},
        published_url = ${input.publishedUrl},
        updated_at = now()
      WHERE id = ${input.id}
      RETURNING id
    `
    if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'icerik_bulunamadi' })
    return
  }
  await sql`
    INSERT INTO content_items (channel, title, status, slug, brief, planned_date, published_url)
    VALUES (${input.channel}, ${input.title}, ${input.status}, ${input.slug},
            ${brief}::jsonb, ${input.plannedDate}, ${input.publishedUrl})
  `
}

/** Siler; metrikleri FK CASCADE ile gider. Yoksa sessizce geçer (idempotent). */
export async function deleteContentItem(sql: Sql, id: number): Promise<void> {
  await sql`DELETE FROM content_items WHERE id = ${id}`
}

// ── Metrikler ────────────────────────────────────────────────────────────────
export async function listMetrics(sql: Sql): Promise<ContentMetric[]> {
  const rows = await sql`SELECT * FROM content_metrics ORDER BY metric_date DESC, id DESC`
  return rows.map(mapMetric)
}

/** (itemId, metricDate) üzerine yazan upsert; içerik yoksa 422. */
export async function upsertMetric(sql: Sql, input: ContentMetricInput): Promise<void> {
  const exists = await sql`SELECT 1 FROM content_items WHERE id = ${input.itemId}`
  if (!exists.length) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:itemId' })
  await sql`
    INSERT INTO content_metrics (item_id, metric_date, views, likes, comments, shares, saves, clicks, notes)
    VALUES (${input.itemId}, ${input.metricDate}, ${input.views}, ${input.likes}, ${input.comments},
            ${input.shares}, ${input.saves}, ${input.clicks}, ${input.notes})
    ON CONFLICT (item_id, metric_date) DO UPDATE SET
      views = EXCLUDED.views, likes = EXCLUDED.likes, comments = EXCLUDED.comments,
      shares = EXCLUDED.shares, saves = EXCLUDED.saves, clicks = EXCLUDED.clicks,
      notes = EXCLUDED.notes, updated_at = now()
  `
}

export async function deleteMetric(sql: Sql, id: number): Promise<void> {
  await sql`DELETE FROM content_metrics WHERE id = ${id}`
}

// ── Blog yazıları ────────────────────────────────────────────────────────────
export async function listPostsSummary(sql: Sql): Promise<BlogPostSummary[]> {
  const rows = await sql`
    SELECT slug, title, status, published_at, reading_minutes, item_id, updated_at
    FROM blog_posts
    ORDER BY published_at DESC NULLS LAST, updated_at DESC
  `
  return rows.map(mapPostSummary)
}

/** Yayındaki yazılar (gövdesiz kullanım için de tam satır) — 60 sn cache'li; Faz C sayfaları okur. */
export async function getPublishedPosts(event: H3Event): Promise<BlogPost[]> {
  if (postsCache && Date.now() - postsCache.at < POSTS_CACHE_TTL_MS) return postsCache.posts
  const sql = sqlClient(event)
  if (!sql) return []
  try {
    await ensureContentTables(sql)
    const rows = await sql`
      SELECT * FROM blog_posts WHERE status = 'yayinda'
      ORDER BY published_at DESC NULLS LAST
    `
    const posts = rows.map(mapPost)
    postsCache = { at: Date.now(), posts }
    return posts
  } catch (err) {
    console.error('[icerik] blog yazıları okunamadı:', err)
    return []
  }
}

export async function getPublishedPost(event: H3Event, slug: string): Promise<BlogPost | null> {
  const posts = await getPublishedPosts(event)
  return posts.find((p) => p.slug === slug) ?? null
}

// ── Panel payload'ı ──────────────────────────────────────────────────────────
/** Panelin tek seferde ihtiyacı: plan + metrikler + yazı özetleri + DB durumu. */
export async function buildContentAdminPayload(event: H3Event): Promise<AdminContentPayload> {
  const sql = sqlClient(event)
  if (!sql) return { dbConnected: false, live: true, items: [], metrics: [], posts: [] }
  try {
    await ensureContentTables(sql)
    const [items, metrics, posts] = await Promise.all([
      listContentItems(sql),
      listMetrics(sql),
      listPostsSummary(sql),
    ])
    return { dbConnected: true, live: true, items, metrics, posts }
  } catch (err) {
    // Okuma hatasında panel mock'a düşmesin ama salt-okunur olduğunu görsün.
    console.error('[icerik] payload okunamadı:', err)
    return { dbConnected: false, live: true, items: [], metrics: [], posts: [] }
  }
}

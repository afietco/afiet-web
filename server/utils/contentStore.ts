import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'
import type {
  AdminContentPayload,
  AttachmentKind,
  AttachmentStatus,
  BlogPost,
  BlogPostSummary,
  ContentAttachment,
  ContentBrief,
  ContentItem,
  ContentItemInput,
  ContentMetric,
  ContentMetricInput,
  ContentMusic,
} from './contentTypes'
import { CONTENT_TZ, emptyBrief } from './contentTypes'
import { storageReady } from './gcsSign'

/**
 * İçerik takvimi + blog verisi: SEO/beta ile aynı Neon'da, landing'e ait
 * kendi kendini kuran tablolar (seoStore deseni; backend'in golang-migrate
 * şemasından bağımsız). DB yoksa admin GET boş listelerle `dbConnected:false`
 * döner, yazma uçları 503 verir - smoke/CI ortamı DB'siz de yeşildir.
 *
 * ŞEMA GELİŞTİRME: tablolar prod'da veriyle yaşıyor, o yüzden CREATE TABLE IF
 * NOT EXISTS yetmez - `ensureContentTables` eklemeli ALTER'ları da koşar
 * (ADD COLUMN IF NOT EXISTS + adlandırılmış CHECK kısıtını düşür/ekle).
 * Kolon SİLME ya da tip daraltma yapılmaz.
 *
 * Panel uçları taze okur (yazma sonrası dönen payload panelin tek gerçeği);
 * 60 sn bellek cache'i yalnız yayındaki blog yazılarına uygulanır.
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
      channel text NOT NULL,
      title text NOT NULL,
      status text NOT NULL DEFAULT 'fikir',
      slug text,
      brief jsonb NOT NULL DEFAULT '{}'::jsonb,
      planned_date date,
      published_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  // Takvim alanları (Tem 2026). Eski satırlar bozulmadan büyür.
  await sql`
    ALTER TABLE content_items
      ADD COLUMN IF NOT EXISTS format text,
      ADD COLUMN IF NOT EXISTS planned_at timestamptz,
      ADD COLUMN IF NOT EXISTS all_day boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS caption text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS first_comment text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS hook text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS series text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS series_code text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS alt_text text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS captions_ready boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS music jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS platform_post_id text
  `
  // Eski satırlar: biçim kanaldan türetilir, saat gece yarısı sayılır (all_day).
  await sql`UPDATE content_items SET format = CASE WHEN channel = 'blog' THEN 'yazi' ELSE 'post' END WHERE format IS NULL`
  await sql`ALTER TABLE content_items ALTER COLUMN format SET DEFAULT 'yazi'`
  await sql`ALTER TABLE content_items ALTER COLUMN format SET NOT NULL`
  await sql`
    UPDATE content_items
    SET planned_at = (planned_date::timestamp AT TIME ZONE ${CONTENT_TZ})
    WHERE planned_at IS NULL AND planned_date IS NOT NULL
  `
  // CHECK'ler adlandırılmış: platform/biçim listesi büyüdükçe düşür-ekle ile
  // güncellenir. TUZAK: doğrulama listesi contentTypes.ts > CHANNELS /
  // CONTENT_FORMATS'tır; DB kısıtı ile o liste HEP birlikte değişir.
  await sql`ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_channel_check`
  await sql`
    ALTER TABLE content_items
      ADD CONSTRAINT content_items_channel_check
      CHECK (channel IN ('blog','instagram','x','tiktok','youtube'))
  `
  await sql`ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_format_check`
  await sql`
    ALTER TABLE content_items
      ADD CONSTRAINT content_items_format_check
      CHECK (format IN ('yazi','reel','carousel','story','post','shorts','video'))
  `
  await sql`ALTER TABLE content_items DROP CONSTRAINT IF EXISTS content_items_status_check`
  await sql`
    ALTER TABLE content_items
      ADD CONSTRAINT content_items_status_check
      CHECK (status IN ('fikir','planlandi','uretimde','yayinda','arsiv'))
  `
  await sql`CREATE INDEX IF NOT EXISTS content_items_planned_at_idx ON content_items (planned_at)`

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
  // Ölçüm kaynağı: elle mi girildi, platform API'sinden mi geldi (Faz 2).
  await sql`ALTER TABLE content_metrics ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'elle'`
  // Platformdan gelen iki ek ölçü; elle girişte 0 kalır.
  await sql`
    ALTER TABLE content_metrics
      ADD COLUMN IF NOT EXISTS reach int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS interactions int NOT NULL DEFAULT 0
  `
  // Etkinliğe bağlı indirilebilir dosyalar; nesne gs://<kova>/<object_key>'de.
  await sql`
    CREATE TABLE IF NOT EXISTS content_attachments (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      item_id bigint NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
      object_key text NOT NULL UNIQUE,
      file_name text NOT NULL,
      mime text NOT NULL,
      kind text NOT NULL CHECK (kind IN ('video','gorsel','pdf')),
      size_bytes bigint NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'bekliyor' CHECK (status IN ('bekliyor','hazir')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `
  await sql`CREATE INDEX IF NOT EXISTS content_attachments_item_idx ON content_attachments (item_id)`
  ensured = true
}

export function invalidateContentCache() {
  // Şimdilik yalnız blog okuma cache'i; içerik planı uçları hep taze okur.
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
 * yarısı) - toISOString() TZ yüzünden günü kaydırır, yerel alanlardan kur.
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

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)

/** jsonb brief'i tam şekle oturt - eksik alanlar boş, fazlalıklar atılır. */
function readBrief(v: unknown): ContentBrief {
  const src = (typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {}) as Row
  const base = emptyBrief()
  return {
    keywords: readStrArr(src.keywords),
    audience: str(src.audience, base.audience),
    angle: str(src.angle, base.angle),
    tone: str(src.tone, base.tone),
    outline: readStrArr(src.outline),
    internalLinks: readStrArr(src.internalLinks),
    cta: str(src.cta, base.cta),
    sources: readStrArr(src.sources),
    notes: str(src.notes, base.notes),
  }
}

/** jsonb ses kredisi - reel yayınında lisans kontrolü buradan okunur. */
function readMusic(v: unknown): ContentMusic {
  const src = (typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {}) as Row
  return { title: str(src.title), artist: str(src.artist), license: str(src.license), url: str(src.url) }
}

function mapItem(r: Row): ContentItem {
  return {
    id: Number(r.id),
    channel: r.channel as ContentItem['channel'],
    format: (r.format as ContentItem['format']) ?? 'yazi',
    title: String(r.title),
    status: r.status as ContentItem['status'],
    slug: (r.slug as string | null) ?? null,
    brief: readBrief(r.brief),
    plannedAt: toIsoOrNull(r.planned_at),
    allDay: r.all_day !== false,
    plannedDate: toDateStr(r.planned_date),
    publishedUrl: (r.published_url as string | null) ?? null,
    caption: str(r.caption),
    hashtags: readStrArr(r.hashtags),
    firstComment: str(r.first_comment),
    hook: str(r.hook),
    series: str(r.series),
    seriesCode: str(r.series_code),
    altText: str(r.alt_text),
    captionsReady: r.captions_ready === true,
    music: readMusic(r.music),
    platformPostId: (r.platform_post_id as string | null) ?? null,
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
    reach: Number(r.reach ?? 0),
    interactions: Number(r.interactions ?? 0),
    notes: String(r.notes ?? ''),
    source: (r.source as ContentMetric['source']) ?? 'elle',
  }
}

function mapAttachment(r: Row): ContentAttachment {
  return {
    id: Number(r.id),
    itemId: Number(r.item_id),
    fileName: String(r.file_name),
    mime: String(r.mime),
    kind: r.kind as AttachmentKind,
    sizeBytes: Number(r.size_bytes ?? 0),
    status: r.status as AttachmentStatus,
    objectKey: String(r.object_key),
    createdAt: toIso(r.created_at),
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
  const music = JSON.stringify(input.music)
  const hashtags = JSON.stringify(input.hashtags)
  const at = input.plannedAt
  if (input.id) {
    const rows = await sql`
      UPDATE content_items SET
        channel = ${input.channel},
        format = ${input.format},
        title = ${input.title},
        status = ${input.status},
        slug = ${input.slug},
        brief = ${brief}::jsonb,
        planned_at = ${at}::timestamptz,
        all_day = ${input.allDay},
        planned_date = CASE WHEN ${at}::timestamptz IS NULL THEN NULL
                            ELSE ((${at}::timestamptz) AT TIME ZONE ${CONTENT_TZ})::date END,
        published_url = ${input.publishedUrl},
        caption = ${input.caption},
        hashtags = ${hashtags}::jsonb,
        first_comment = ${input.firstComment},
        hook = ${input.hook},
        series = ${input.series},
        series_code = ${input.seriesCode},
        alt_text = ${input.altText},
        captions_ready = ${input.captionsReady},
        music = ${music}::jsonb,
        platform_post_id = ${input.platformPostId},
        updated_at = now()
      WHERE id = ${input.id}
      RETURNING id
    `
    if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'icerik_bulunamadi' })
    return
  }
  await sql`
    INSERT INTO content_items (
      channel, format, title, status, slug, brief, planned_at, all_day, planned_date, published_url,
      caption, hashtags, first_comment, hook, series, series_code, alt_text, captions_ready, music,
      platform_post_id
    )
    VALUES (
      ${input.channel}, ${input.format}, ${input.title}, ${input.status}, ${input.slug}, ${brief}::jsonb,
      ${at}::timestamptz, ${input.allDay},
      CASE WHEN ${at}::timestamptz IS NULL THEN NULL
           ELSE ((${at}::timestamptz) AT TIME ZONE ${CONTENT_TZ})::date END,
      ${input.publishedUrl}, ${input.caption}, ${hashtags}::jsonb, ${input.firstComment}, ${input.hook},
      ${input.series}, ${input.seriesCode}, ${input.altText}, ${input.captionsReady}, ${music}::jsonb,
      ${input.platformPostId}
    )
  `
}

/** Sürükle-bırak yolu: yalnız zamanı taşır, diğer alanlara dokunmaz (yoksa 404). */
export async function moveContentItem(sql: Sql, id: number, plannedAt: string, allDay: boolean): Promise<void> {
  const rows = await sql`
    UPDATE content_items SET
      planned_at = ${plannedAt}::timestamptz,
      all_day = ${allDay},
      planned_date = ((${plannedAt}::timestamptz) AT TIME ZONE ${CONTENT_TZ})::date,
      updated_at = now()
    WHERE id = ${id}
    RETURNING id
  `
  if (!rows.length) throw createError({ statusCode: 404, statusMessage: 'icerik_bulunamadi' })
}

/** Siler; metrikleri ve ek satırları FK CASCADE ile gider. Yoksa sessizce geçer. */
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
    INSERT INTO content_metrics (item_id, metric_date, views, likes, comments, shares, saves, clicks,
                                 reach, interactions, notes, source)
    VALUES (${input.itemId}, ${input.metricDate}, ${input.views}, ${input.likes}, ${input.comments},
            ${input.shares}, ${input.saves}, ${input.clicks}, ${input.reach}, ${input.interactions},
            ${input.notes}, ${input.source})
    ON CONFLICT (item_id, metric_date) DO UPDATE SET
      views = EXCLUDED.views, likes = EXCLUDED.likes, comments = EXCLUDED.comments,
      shares = EXCLUDED.shares, saves = EXCLUDED.saves, clicks = EXCLUDED.clicks,
      reach = EXCLUDED.reach, interactions = EXCLUDED.interactions,
      notes = EXCLUDED.notes, source = EXCLUDED.source, updated_at = now()
  `
}

export async function deleteMetric(sql: Sql, id: number): Promise<void> {
  await sql`DELETE FROM content_metrics WHERE id = ${id}`
}

// ── Ekler ────────────────────────────────────────────────────────────────────
export async function listAttachments(sql: Sql): Promise<ContentAttachment[]> {
  const rows = await sql`SELECT * FROM content_attachments ORDER BY item_id, id`
  return rows.map(mapAttachment)
}

export async function getAttachment(sql: Sql, id: number): Promise<ContentAttachment | null> {
  const rows = await sql`SELECT * FROM content_attachments WHERE id = ${id}`
  return rows.length ? mapAttachment(rows[0] as Row) : null
}

/** İçerikteki ek sayısı (bekleyenler dahil) - üst sınır kontrolü için. */
export async function countAttachments(sql: Sql, itemId: number): Promise<number> {
  const rows = await sql`SELECT count(*)::int AS n FROM content_attachments WHERE item_id = ${itemId}`
  return Number((rows[0] as Row | undefined)?.n ?? 0)
}

/** İmza verilmeden önceki satır (status 'bekliyor'). İçerik yoksa 422. */
export async function createAttachment(
  sql: Sql,
  input: { itemId: number; fileName: string; mime: string; kind: AttachmentKind; sizeBytes: number; objectKey: string },
): Promise<number> {
  const exists = await sql`SELECT 1 FROM content_items WHERE id = ${input.itemId}`
  if (!exists.length) throw createError({ statusCode: 422, statusMessage: 'gecersiz_alan:itemId' })
  const rows = await sql`
    INSERT INTO content_attachments (item_id, object_key, file_name, mime, kind, size_bytes)
    VALUES (${input.itemId}, ${input.objectKey}, ${input.fileName}, ${input.mime}, ${input.kind}, ${input.sizeBytes})
    RETURNING id
  `
  return Number((rows[0] as Row).id)
}

/** Yükleme kovada doğrulandıktan sonra: gerçek boyutla 'hazir'. */
export async function markAttachmentReady(sql: Sql, id: number, sizeBytes: number): Promise<void> {
  await sql`
    UPDATE content_attachments
    SET status = 'hazir', size_bytes = ${sizeBytes}, updated_at = now()
    WHERE id = ${id}
  `
}

export async function deleteAttachmentRow(sql: Sql, id: number): Promise<void> {
  await sql`DELETE FROM content_attachments WHERE id = ${id}`
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

/** Yayındaki yazılar (gövdesiz kullanım için de tam satır) - 60 sn cache'li. */
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
/** Panelin tek seferde ihtiyacı: plan + metrikler + ekler + yazı özetleri + durum. */
export async function buildContentAdminPayload(event: H3Event): Promise<AdminContentPayload> {
  const ready = storageReady(event)
  const sql = sqlClient(event)
  const empty = { items: [], metrics: [], attachments: [], posts: [] }
  if (!sql) return { dbConnected: false, live: true, storageReady: ready, ...empty }
  try {
    await ensureContentTables(sql)
    const [items, metrics, attachments, posts] = await Promise.all([
      listContentItems(sql),
      listMetrics(sql),
      listAttachments(sql),
      listPostsSummary(sql),
    ])
    return { dbConnected: true, live: true, storageReady: ready, items, metrics, attachments, posts }
  } catch (err) {
    // Okuma hatasında panel mock'a düşmesin ama salt-okunur olduğunu görsün.
    console.error('[icerik] payload okunamadı:', err)
    return { dbConnected: false, live: true, storageReady: ready, ...empty }
  }
}

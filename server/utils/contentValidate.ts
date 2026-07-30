import type {
  AttachmentCreateInput,
  ContentBrief,
  ContentItemInput,
  ContentMetricInput,
  ContentMusic,
} from './contentTypes'
import {
  ALLOWED_MIME,
  ATTACHMENT_MAX_BYTES,
  CHANNELS,
  CONTENT_FORMATS,
  CONTENT_STATUSES,
  FORMATS_BY_CHANNEL,
  METRIC_SOURCES,
  emptyBrief,
} from './contentTypes'

/**
 * Panelden gelen içerik gövdelerini temizler (seoValidate deseni):
 * bilinen alanlar dışındakiler atılır, tip/limit uymayan alan 422 fırlatır.
 * Amaç şema polisliği değil; DB'ye ve prompt'lara çöp sızmasın yeter.
 */

function fail(field: string): never {
  throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:${field}` })
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function reqStr(v: unknown, field: string, max: number): string {
  if (typeof v !== 'string') fail(field)
  const s = v.trim()
  if (!s || s.length > max) fail(field)
  return s
}

function optStr(v: unknown, field: string, max: number): string {
  if (v === undefined || v === null) return ''
  if (typeof v !== 'string' || v.length > max) fail(field)
  return v.trim()
}

function bool(v: unknown, field: string, fallback = false): boolean {
  if (v === undefined || v === null) return fallback
  if (typeof v !== 'boolean') fail(field)
  return v
}

function strArr(v: unknown, field: string, maxItems: number, maxItem: number): string[] {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v) || v.length > maxItems) fail(field)
  return v.map((x) => {
    if (typeof x !== 'string' || x.length > maxItem) fail(field)
    return x.trim()
  }).filter(Boolean)
}

function posInt(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0) fail(field)
  return v
}

function count(v: unknown, field: string): number {
  if (v === undefined || v === null) return 0
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 1_000_000_000) fail(field)
  return v
}

function dateStr(v: unknown, field: string): string {
  if (typeof v !== 'string' || !DATE_RE.test(v) || Number.isNaN(new Date(`${v}T00:00:00Z`).getTime())) fail(field)
  return v
}

/** ISO 8601 an (timestamptz). Normalize edilip UTC ISO olarak döner. */
function isoInstant(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.length > 40) fail(field)
  const t = new Date(v)
  if (Number.isNaN(t.getTime())) fail(field)
  return t.toISOString()
}

function httpUrl(v: unknown, field: string, max = 500): string {
  if (v === undefined || v === null || v === '') return ''
  if (typeof v !== 'string' || v.length > max || !/^https?:\/\//.test(v)) fail(field)
  return v.trim()
}

function sanitizeBrief(v: unknown): ContentBrief {
  if (v === undefined || v === null) return emptyBrief()
  if (!isObj(v)) fail('brief')
  return {
    keywords: strArr(v.keywords, 'brief.keywords', 20, 80),
    audience: optStr(v.audience, 'brief.audience', 300),
    angle: optStr(v.angle, 'brief.angle', 300),
    tone: optStr(v.tone, 'brief.tone', 200),
    outline: strArr(v.outline, 'brief.outline', 30, 300),
    internalLinks: strArr(v.internalLinks, 'brief.internalLinks', 10, 500),
    cta: optStr(v.cta, 'brief.cta', 300),
    sources: strArr(v.sources, 'brief.sources', 10, 500),
    notes: optStr(v.notes, 'brief.notes', 2000),
  }
}

function sanitizeMusic(v: unknown): ContentMusic {
  if (v === undefined || v === null) return { title: '', artist: '', license: '', url: '' }
  if (!isObj(v)) fail('music')
  return {
    title: optStr(v.title, 'music.title', 200),
    artist: optStr(v.artist, 'music.artist', 200),
    license: optStr(v.license, 'music.license', 300),
    url: httpUrl(v.url, 'music.url'),
  }
}

/**
 * Etiketler tek biçime çekilir: baştaki '#'ler ve boşluklar temizlenip tek '#'
 * ile yazılır. Üst sınır 10; marka kuralı olan "en fazla 5 etiket" panelde
 * uyarı olarak yaşar (kural editoryaldır, veri katmanı sertçe kesmez).
 */
function hashtags(v: unknown): string[] {
  const raw = strArr(v, 'hashtags', 10, 60)
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    const tag = item.replace(/\s+/g, '').replace(/^#+/, '')
    if (!tag) continue
    const withHash = `#${tag}`
    if (seen.has(withHash.toLocaleLowerCase('tr-TR'))) continue
    seen.add(withHash.toLocaleLowerCase('tr-TR'))
    out.push(withHash)
  }
  return out
}

export function sanitizeContentItem(value: unknown): ContentItemInput {
  if (!isObj(value)) fail('body')

  let id: number | undefined
  if (value.id !== undefined && value.id !== null) id = posInt(value.id, 'id')

  const channel = CHANNELS.find((c) => c === value.channel) ?? fail('channel')
  const status = CONTENT_STATUSES.find((s) => s === value.status) ?? fail('status')
  const title = reqStr(value.title, 'title', 300)

  // Biçim platformla tutarlı olmalı (blog → yazi, instagram → reel/carousel/...).
  const format = CONTENT_FORMATS.find((f) => f === value.format) ?? fail('format')
  if (!FORMATS_BY_CHANNEL[channel].includes(format)) fail('format')

  let slug: string | null = null
  if (value.slug !== undefined && value.slug !== null && value.slug !== '') {
    if (channel !== 'blog') fail('slug') // slug yalnız blog kanalında anlamlı
    if (typeof value.slug !== 'string' || value.slug.length > 120 || !SLUG_RE.test(value.slug)) fail('slug')
    slug = value.slug
  }

  let plannedAt: string | null = null
  if (value.plannedAt !== undefined && value.plannedAt !== null && value.plannedAt !== '') {
    plannedAt = isoInstant(value.plannedAt, 'plannedAt')
  }

  let publishedUrl: string | null = null
  if (value.publishedUrl !== undefined && value.publishedUrl !== null && value.publishedUrl !== '') {
    publishedUrl = httpUrl(value.publishedUrl, 'publishedUrl') || null
  }

  let platformPostId: string | null = null
  if (value.platformPostId !== undefined && value.platformPostId !== null && value.platformPostId !== '') {
    if (typeof value.platformPostId !== 'string' || !/^[\w.-]{1,120}$/.test(value.platformPostId)) {
      fail('platformPostId')
    }
    platformPostId = value.platformPostId
  }

  return {
    id,
    channel,
    format,
    title,
    status,
    slug,
    brief: sanitizeBrief(value.brief),
    plannedAt,
    allDay: bool(value.allDay, 'allDay', true),
    publishedUrl,
    caption: optStr(value.caption, 'caption', 2200),
    hashtags: hashtags(value.hashtags),
    firstComment: optStr(value.firstComment, 'firstComment', 2200),
    hook: optStr(value.hook, 'hook', 300),
    series: optStr(value.series, 'series', 80),
    seriesCode: optStr(value.seriesCode, 'seriesCode', 24),
    altText: optStr(value.altText, 'altText', 1000),
    captionsReady: bool(value.captionsReady, 'captionsReady'),
    music: sanitizeMusic(value.music),
    platformPostId,
  }
}

/** Sürükle-bırak gövdesi: yalnız kimlik + yeni an. */
export function sanitizeMove(value: unknown): { id: number; plannedAt: string; allDay: boolean } {
  if (!isObj(value)) fail('body')
  return {
    id: posInt(value.id, 'id'),
    plannedAt: isoInstant(value.plannedAt, 'plannedAt'),
    allDay: bool(value.allDay, 'allDay'),
  }
}

export function sanitizeContentMetric(value: unknown): ContentMetricInput {
  if (!isObj(value)) fail('body')
  return {
    itemId: posInt(value.itemId, 'itemId'),
    metricDate: dateStr(value.metricDate, 'metricDate'),
    views: count(value.views, 'views'),
    likes: count(value.likes, 'likes'),
    comments: count(value.comments, 'comments'),
    shares: count(value.shares, 'shares'),
    saves: count(value.saves, 'saves'),
    clicks: count(value.clicks, 'clicks'),
    reach: count(value.reach, 'reach'),
    interactions: count(value.interactions, 'interactions'),
    notes: optStr(value.notes, 'notes', 500),
    source: METRIC_SOURCES.find((s) => s === value.source) ?? 'elle',
  }
}

/**
 * Ek yükleme isteği. MIME izin listesinden gelmeli VE dosya uzantısı o MIME'a
 * ait olmalı (imzalı URL yalnız bu Content-Type'ı kabul edeceği için istemci
 * sonradan tür değiştiremez).
 */
export function sanitizeAttachmentCreate(value: unknown): AttachmentCreateInput {
  if (!isObj(value)) fail('body')
  const itemId = posInt(value.itemId, 'itemId')
  const mime = typeof value.mime === 'string' ? value.mime : fail('mime')
  const allowed = ALLOWED_MIME[mime] ?? fail('mime')

  // Dosya adı: yol ayraçları '_' olur, kontrol karakterleri atılır.
  const rawName = reqStr(value.fileName, 'fileName', 200)
    .replace(/[/\\]/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
  if (!rawName) fail('fileName')
  const ext = rawName.includes('.') ? rawName.split('.').pop()!.toLocaleLowerCase('en-US') : ''
  if (!allowed.ext.includes(ext)) fail('fileName')

  const sizeBytes = posInt(value.sizeBytes, 'sizeBytes')
  if (sizeBytes > ATTACHMENT_MAX_BYTES) fail('sizeBytes')

  return { itemId, fileName: rawName, mime, sizeBytes }
}

/** ?id= sorgu parametresi. */
export function sanitizeIdParam(raw: unknown): number {
  const n = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN
  if (!Number.isInteger(n) || n <= 0) fail('id')
  return n
}

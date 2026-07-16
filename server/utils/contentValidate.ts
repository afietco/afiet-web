import type { ContentBrief, ContentItemInput, ContentMetricInput } from './contentTypes'
import { CHANNELS, CONTENT_STATUSES, emptyBrief } from './contentTypes'

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

export function sanitizeContentItem(value: unknown): ContentItemInput {
  if (!isObj(value)) fail('body')

  let id: number | undefined
  if (value.id !== undefined && value.id !== null) id = posInt(value.id, 'id')

  const channel = CHANNELS.find((c) => c === value.channel) ?? fail('channel')
  const status = CONTENT_STATUSES.find((s) => s === value.status) ?? fail('status')
  const title = reqStr(value.title, 'title', 300)

  let slug: string | null = null
  if (value.slug !== undefined && value.slug !== null && value.slug !== '') {
    if (channel !== 'blog') fail('slug') // slug yalnız blog kanalında anlamlı
    if (typeof value.slug !== 'string' || value.slug.length > 120 || !SLUG_RE.test(value.slug)) fail('slug')
    slug = value.slug
  }

  let plannedDate: string | null = null
  if (value.plannedDate !== undefined && value.plannedDate !== null && value.plannedDate !== '') {
    plannedDate = dateStr(value.plannedDate, 'plannedDate')
  }

  let publishedUrl: string | null = null
  if (value.publishedUrl !== undefined && value.publishedUrl !== null && value.publishedUrl !== '') {
    if (
      typeof value.publishedUrl !== 'string' ||
      value.publishedUrl.length > 500 ||
      !/^https?:\/\//.test(value.publishedUrl)
    ) {
      fail('publishedUrl')
    }
    publishedUrl = value.publishedUrl.trim()
  }

  return { id, channel, title, status, slug, brief: sanitizeBrief(value.brief), plannedDate, publishedUrl }
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
    notes: optStr(value.notes, 'notes', 500),
  }
}

/** ?id= sorgu parametresi. */
export function sanitizeIdParam(raw: unknown): number {
  const n = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN
  if (!Number.isInteger(n) || n <= 0) fail('id')
  return n
}

/**
 * İçerik planı + blog veri sözleşmesi (kaynak-of-truth).
 *
 * Panel tarafındaki afiet-admin/src/services/content.ts bu tiplerin BİREBİR
 * aynasıdır — alan eklerken/değiştirirken iki ucu birlikte güncelle.
 * (seoTypes ↔ webApi.ts ile aynı kural.)
 */

export type Channel = 'blog' | 'instagram' | 'x'
export type ContentStatus = 'fikir' | 'planlandi' | 'uretimde' | 'yayinda' | 'arsiv'
export type BlogPostStatus = 'taslak' | 'yayinda'

export const CHANNELS: Channel[] = ['blog', 'instagram', 'x']
export const CONTENT_STATUSES: ContentStatus[] = ['fikir', 'planlandi', 'uretimde', 'yayinda', 'arsiv']

/** İçerik brief'i — panelin "prompt-ready" alanları; jsonb olarak saklanır. */
export type ContentBrief = {
  keywords: string[]
  audience: string
  angle: string
  tone: string
  outline: string[]
  internalLinks: string[]
  cta: string
  sources: string[]
  notes: string
}

export type ContentItem = {
  id: number
  channel: Channel
  title: string
  status: ContentStatus
  /** Yalnız blog kanalı; afiet.co/blog/<slug>. */
  slug: string | null
  brief: ContentBrief
  /** YYYY-MM-DD — hedeflenen yayın günü. */
  plannedDate: string | null
  publishedUrl: string | null
  createdAt: string
  updatedAt: string
}

/** PUT gövdesi: id varsa güncelleme, yoksa ekleme. */
export type ContentItemInput = Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: number }

/** Elle girilen dönemsel ölçüm — (itemId, metricDate) benzersizdir, üzerine yazar. */
export type ContentMetric = {
  id: number
  itemId: number
  metricDate: string
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  notes: string
}

export type ContentMetricInput = Omit<ContentMetric, 'id'>

export type BlogPost = {
  slug: string
  title: string
  description: string
  contentMd: string
  tags: string[]
  coverUrl: string | null
  status: BlogPostStatus
  readingMinutes: number | null
  itemId: number | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

/** Panel listesi için gövdesiz özet. */
export type BlogPostSummary = Pick<
  BlogPost,
  'slug' | 'title' | 'status' | 'publishedAt' | 'readingMinutes' | 'itemId' | 'updatedAt'
>

export type AdminContentPayload = {
  dbConnected: boolean
  /** Panel mock/canlı rozeti için: gerçek uçtan gelen yanıt hep true döner. */
  live: boolean
  items: ContentItem[]
  metrics: ContentMetric[]
  posts: BlogPostSummary[]
}

export const emptyBrief = (): ContentBrief => ({
  keywords: [],
  audience: '',
  angle: '',
  tone: '',
  outline: [],
  internalLinks: [],
  cta: '',
  sources: [],
  notes: '',
})

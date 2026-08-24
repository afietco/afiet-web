/**
 * İçerik takvimi + blog veri sözleşmesi (kaynak-of-truth).
 *
 * Panel tarafındaki afiet-admin/src/services/content.ts bu tiplerin BİREBİR
 * aynasıdır - alan eklerken/değiştirirken iki ucu birlikte güncelle.
 * (seoTypes ↔ webApi.ts ile aynı kural.)
 *
 * İSİMLENDİRME NOTU: `channel` alanı UI'da "platform" olarak görünür; DB
 * kolonu ve tel üzerindeki ad tarihsel olarak `channel` kaldı (prod verisi
 * bunun üzerinde duruyor, yeniden adlandırma bedeli faydasından büyük).
 * İkinci eksen `format`tır: aynı platformda reel/carousel/story ayrımı.
 */

export type Channel = 'blog' | 'instagram' | 'x' | 'tiktok' | 'youtube'
export type ContentFormat = 'yazi' | 'reel' | 'carousel' | 'story' | 'post' | 'shorts' | 'video'
export type ContentStatus = 'fikir' | 'planlandi' | 'uretimde' | 'yayinda' | 'arsiv'
export type BlogPostStatus = 'taslak' | 'yayinda'
/**
 * Ölçümün nereden geldiği: elle mi girildi, platform API'sinden mi çekildi,
 * yoksa panele indirilen dışa aktarım dosyasından mı ('csv', ör. Meta Business
 * Suite > Insights > Export Data).
 */
export type MetricSource = 'elle' | 'csv' | 'instagram' | 'youtube' | 'tiktok' | 'x'
/** Ek yaşam döngüsü: imza verildi (bekliyor) → nesne kovada doğrulandı (hazir). */
export type AttachmentStatus = 'bekliyor' | 'hazir'
export type AttachmentKind = 'video' | 'gorsel' | 'pdf'

export const CHANNELS: Channel[] = ['blog', 'instagram', 'x', 'tiktok', 'youtube']
export const CONTENT_FORMATS: ContentFormat[] = ['yazi', 'reel', 'carousel', 'story', 'post', 'shorts', 'video']
export const CONTENT_STATUSES: ContentStatus[] = ['fikir', 'planlandi', 'uretimde', 'yayinda', 'arsiv']
export const METRIC_SOURCES: MetricSource[] = ['elle', 'csv', 'instagram', 'youtube', 'tiktok', 'x']
/** Tek istekte içe aktarılabilecek en fazla ölçüm satırı. */
export const METRICS_IMPORT_MAX = 500

/** Hangi platformda hangi biçimler anlamlı - doğrulama ve UI aynı listeyi okur. */
export const FORMATS_BY_CHANNEL: Record<Channel, ContentFormat[]> = {
  blog: ['yazi'],
  instagram: ['reel', 'carousel', 'story', 'post'],
  x: ['post', 'video'],
  tiktok: ['video'],
  youtube: ['shorts', 'video'],
}

/** Planlama saatleri tek saat diliminde yaşar: ekip Türkiye'de. */
export const CONTENT_TZ = 'Europe/Istanbul'

/** İçerik brief'i - panelin "prompt-ready" alanları; jsonb olarak saklanır. */
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

/** Reel/video için ses kredisi - yayın öncesi lisans kontrolü buradan yapılır. */
export type ContentMusic = {
  title: string
  artist: string
  license: string
  url: string
}

export type ContentItem = {
  id: number
  /** Platform (UI'daki adı "platform"). */
  channel: Channel
  format: ContentFormat
  title: string
  status: ContentStatus
  /** Yalnız blog kanalı; afiet.co/blog/<slug>. */
  slug: string | null
  brief: ContentBrief
  /**
   * Takvimdeki an (ISO, timestamptz). Tüm-gün işaretliyse saat anlamsızdır ve
   * Europe/Istanbul gece yarısını gösterir.
   */
  plannedAt: string | null
  allDay: boolean
  /**
   * plannedAt'in Europe/Istanbul karşılığı olan gün (YYYY-MM-DD). Geriye
   * uyumluluk için yazılmaya devam eder; tek gerçek plannedAt'tir.
   */
  plannedDate: string | null
  publishedUrl: string | null
  /** Yayın metni ve yanındaki her şey. */
  caption: string
  hashtags: string[]
  firstComment: string
  hook: string
  series: string
  seriesCode: string
  altText: string
  captionsReady: boolean
  music: ContentMusic
  /** Platformdaki gönderi kimliği (IG media id / video id / post id) - Faz 2 otomatik ölçüm eşleşmesi. */
  platformPostId: string | null
  createdAt: string
  updatedAt: string
}

/** PUT gövdesi: id varsa güncelleme, yoksa ekleme. */
export type ContentItemInput = Omit<ContentItem, 'id' | 'plannedDate' | 'createdAt' | 'updatedAt'> & { id?: number }

/** Dönemsel ölçüm - (itemId, metricDate) benzersizdir, üzerine yazar. */
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
  /** Instagram/TikTok gibi platformlardan gelen tekil erisim (elle girisde 0). */
  reach: number
  /** Platformun "total_interactions" karsiligi; elle girisde 0. */
  interactions: number
  notes: string
  source: MetricSource
}

export type ContentMetricInput = Omit<ContentMetric, 'id'>

/** Bir etkinliğe bağlı indirilebilir dosya; nesne gs://<kova>/<objectKey>'de durur. */
export type ContentAttachment = {
  id: number
  itemId: number
  fileName: string
  mime: string
  kind: AttachmentKind
  sizeBytes: number
  status: AttachmentStatus
  objectKey: string
  createdAt: string
}

export type AttachmentCreateInput = {
  itemId: number
  fileName: string
  mime: string
  sizeBytes: number
}

/** İmzalı yükleme bileti: panel dosyayı DOĞRUDAN kovaya PUT eder. */
export type AttachmentUploadTicket = {
  attachmentId: number
  objectKey: string
  uploadUrl: string
  /** İmzanın geçerlilik süresi (saniye). */
  expiresIn: number
  /** PUT sırasında birebir gönderilmesi gereken Content-Type. */
  contentType: string
}

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
  /**
   * Yazının dili. TR yazılar /blog altında, İngilizce yazılar /en/blog altında
   * listelenir ve bir yazı yalnız KENDİ dilinin yolundan açılır.
   *
   * NOT: `BlogPostSummary`ye bilinçli olarak eklenmedi. Özet tipi afiet-admin
   * `src/services/content.ts` ile BİREBİR aynadır; panel dil desteğini ayrı
   * bir turda alacak (kullanıcı kararı, 6 Ağu 2026) ve o güne kadar iki repo
   * senkron kalır.
   */
  lang: SiteLang
  /**
   * Karşı dildeki yazının slug'ı; çoğu yazıda null (İngilizce yazılar çeviri
   * değil, kendi arama diline göre kurgulanmış). Dolu VE karşı yazı yayında
   * ise iki yazı birbirine hreflang verir.
   */
  translationOf: string | null
  /**
   * Instagram story payload'ı (server/utils/storyPayload.ts). İçerik hattı
   * yayından sonra /api/internal/blog/story ile iliştirir; /story/<slug>.png
   * bundan çizer. Elle yayınlanan yazılarda null kalır ve story rotası 404
   * döner: story'siz yazı bir eksik değil, varsayılandır.
   */
  story: import('./storyPayload').StoryPayload | null
}

/** Blog yazısının dili; site dilleriyle aynı küme (shared/utils/locales.ts). */
export type SiteLang = 'tr' | 'en'

/** Panel listesi için gövdesiz özet. */
export type BlogPostSummary = Pick<
  BlogPost,
  'slug' | 'title' | 'status' | 'publishedAt' | 'readingMinutes' | 'itemId' | 'updatedAt'
>

export type AdminContentPayload = {
  dbConnected: boolean
  /** Panel mock/canlı rozeti için: gerçek uçtan gelen yanıt hep true döner. */
  live: boolean
  /** Ek yükleme/indirme açık mı (GCS anahtarı yapılandırılmış mı). */
  storageReady: boolean
  items: ContentItem[]
  metrics: ContentMetric[]
  attachments: ContentAttachment[]
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

export const emptyMusic = (): ContentMusic => ({ title: '', artist: '', license: '', url: '' })

// ── Ek dosya kuralları (doğrulama ve UI aynı yerden okur) ────────────────────
export const ATTACHMENT_MAX_BYTES = 200 * 1024 * 1024
export const ATTACHMENT_MAX_PER_ITEM = 20

/** İzinli MIME → tür ve uzantı(lar). Listede olmayan dosya reddedilir. */
export const ALLOWED_MIME: Record<string, { kind: AttachmentKind; ext: string[] }> = {
  'video/mp4': { kind: 'video', ext: ['mp4'] },
  'video/quicktime': { kind: 'video', ext: ['mov'] },
  'image/png': { kind: 'gorsel', ext: ['png'] },
  'image/jpeg': { kind: 'gorsel', ext: ['jpg', 'jpeg'] },
  'image/webp': { kind: 'gorsel', ext: ['webp'] },
  'image/gif': { kind: 'gorsel', ext: ['gif'] },
  'application/pdf': { kind: 'pdf', ext: ['pdf'] },
}

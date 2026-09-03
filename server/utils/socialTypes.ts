/**
 * Bağlı sosyal hesaplar + otomatik ölçüm sözleşmesi (kaynak-of-truth).
 *
 * Panel tarafındaki afiet-admin/src/services/social.ts bu tiplerin BİREBİR
 * aynasıdır. contentTypes.ts ile aynı kural: alan eklerken iki ucu birlikte
 * güncelle.
 *
 * Faz 2 Instagram'la açıldı, YouTube 29 Ağu 2026'da aynı tablolara oturdu
 * (`social_accounts` + `social_posts`); ölçüm tabloları platform başına ayrı
 * (`content_metrics` vs `youtube_daily`), çünkü iki platform aynı şeyi
 * ölçmüyor. TikTok/X için `platform` alanı yine hazır.
 */

import type { Channel } from './contentTypes'

/** Hesap bağlantısının sağlığı - panel rozeti buradan gelir. */
export type AccountStatus = 'bagli' | 'suresi_doluyor' | 'kopuk'

export type SocialAccount = {
  id: number
  platform: Channel
  /** @afiet.co gibi kullanıcı adı (token'dan okunur, elle girilmez). */
  handle: string
  /** Platformdaki hesap kimliği (IG user id). */
  externalId: string
  status: AccountStatus
  /** Token bitiş anı (ISO). Yenileme cron'da otomatik. */
  expiresAt: string | null
  lastSyncAt: string | null
  /** Son senkronda ne oldu: kaç gönderi eşleşti, kaç ölçüm yazıldı ya da hata. */
  lastResult: string
  createdAt: string
}

/**
 * Platformdan çekilen gönderi. Takvimdeki etkinliğe `itemId` ile bağlanır;
 * bağlanmamışsa panelde "eşleşmemiş" listesinde durur ve tek tıkla bağlanır.
 */
export type SocialPost = {
  id: number
  platform: Channel
  externalId: string
  permalink: string
  /** Platformdaki yayın anı (ISO). */
  publishedAt: string | null
  mediaType: string
  caption: string
  thumbnailUrl: string | null
  itemId: number | null
  createdAt: string
}

export type AdminSocialPayload = {
  dbConnected: boolean
  live: boolean
  /** Instagram uygulama kimlikleri tanımlı mı (yoksa bağlama akışı kapalı). */
  instagramReady: boolean
  /** Bağlama akışı yalnız bu adreste çalışır (Meta'ya kayıtlı redirect_uri). */
  connectHost: string
  /** Google OAuth istemcisi tanımlı mı (yoksa YouTube bağlama akışı kapalı). */
  youtubeReady: boolean
  /** Google'a KAYITLI redirect_uri; YouTube bağlaması yalnız o adreste çalışır. */
  youtubeConnectHost: string
  accounts: SocialAccount[]
  /** Yalnız eşleşmemiş gönderiler; eşleşenler etkinliğin üstünde görünür. */
  unmatched: SocialPost[]
}

export const emptySocialPayload = (): AdminSocialPayload => ({
  dbConnected: false,
  live: false,
  instagramReady: false,
  connectHost: '',
  youtubeReady: false,
  youtubeConnectHost: '',
  accounts: [],
  unmatched: [],
})

/** Bir senkron turunun sonucu (cron yanıtı + panel rozeti metni). */
export type SyncSummary = {
  platform: Channel
  handle: string
  /** Platformdan okunan gönderi sayısı. */
  fetched: number
  /** Takvim etkinliğiyle yeni eşleşen gönderi sayısı. */
  matched: number
  /** content_metrics'e yazılan ölçüm sayısı. */
  measured: number
  /** Token yenilendi mi. */
  refreshed: boolean
  errors: string[]
}

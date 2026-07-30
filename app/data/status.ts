/**
 * Durum sayfası MOCK verisi. UI onaylanınca bu modülün yerini
 * /api/status alacak; tipler o yanıtın sözleşmesidir (aynı şekil).
 *
 * Gerçek sürümde kaynaklar:
 * - Uygulama sunucusu: Cloud Run prod /readyz (5 dk'da bir cron ping'i)
 * - Veritabanı: readyz şema kontrolü + Neon status.io API'si
 * - Web / Yönetim: kendi uçlarımıza ping + Vercel statuspage API'si
 * - Afi yapay zekâ: Azure durum akışı + son başarılı ajan çağrısı
 * - Kimlik doğrulama / E-posta: sağlayıcı durum sayfaları
 */

export type ServiceState = 'up' | 'degraded' | 'down' | 'none'

export interface DayPoint {
  /** ISO gün (YYYY-MM-DD) */
  date: string
  state: ServiceState
  /** O güne dair kısa not (yalnız sorunlu günlerde) */
  note?: string
}

export interface StatusComponent {
  id: string
  name: string
  provider: string
  /** Besin grubu vurgu rengi (main.css'teki eşleme) */
  accent: 'sebze' | 'meyve' | 'protein' | 'tahil' | 'sut'
  state: ServiceState
  /** 90 günlük yüzde (iki ondalık, string olarak basılır) */
  uptime: string
  days: DayPoint[]
}

export interface ProviderStatus {
  name: string
  note: string
  url: string
  state: ServiceState
}

export interface IncidentUpdate {
  time: string
  text: string
}

export interface Incident {
  id: string
  title: string
  date: string
  duration: string
  resolved: boolean
  affected: string[]
  updates: IncidentUpdate[]
}

export const STATE_LABEL: Record<ServiceState, string> = {
  up: 'Çalışıyor',
  degraded: 'Yavaşlama',
  down: 'Kesinti',
  none: 'Veri yok',
}

const DAY_MS = 86_400_000

function isoDay(offsetFromToday: number): string {
  return new Date(Date.now() - offsetFromToday * DAY_MS).toISOString().slice(0, 10)
}

/** 90 günlük şerit üretir; sorunlu günler tarihle işaretlenir. */
function makeDays(issues: Record<string, { state: ServiceState; note: string }> = {}): DayPoint[] {
  const days: DayPoint[] = []
  for (let i = 89; i >= 0; i--) {
    const date = isoDay(i)
    const issue = issues[date]
    days.push(issue ? { date, ...issue } : { date, state: 'up' })
  }
  return days
}

/** 29 Temmuz'daki gerçek kesinti (havuzlu uçta search_path sorunu, 29 dk). */
const DB_OUTAGE = {
  '2026-07-29': {
    state: 'down' as ServiceState,
    note: 'Veritabanı bağlantı kesintisi (29 dk)',
  },
}

export const overall = {
  state: 'up' as ServiceState,
  checkedAt: 'az önce',
  intervalNote: 'Servisler 5 dakikada bir denetlenir.',
}

export const components: StatusComponent[] = [
  {
    id: 'api',
    name: 'Uygulama sunucusu',
    provider: 'Google Cloud Run · europe-west1',
    accent: 'sebze',
    state: 'up',
    uptime: '99,93',
    days: makeDays(DB_OUTAGE),
  },
  {
    id: 'db',
    name: 'Veritabanı',
    provider: 'Neon Postgres',
    accent: 'tahil',
    state: 'up',
    uptime: '99,93',
    days: makeDays(DB_OUTAGE),
  },
  {
    id: 'web',
    name: 'Web sitesi',
    provider: 'afiet.co · Vercel',
    accent: 'sut',
    state: 'up',
    uptime: '100',
    days: makeDays(),
  },
  {
    id: 'afi',
    name: 'Afi yapay zekâ',
    provider: 'Azure AI Foundry',
    accent: 'protein',
    state: 'up',
    uptime: '99,98',
    days: makeDays({
      [isoDay(12)]: { state: 'degraded', note: 'Fotoğraf tanımada gecikmeler' },
    }),
  },
  {
    id: 'auth',
    name: 'Kimlik doğrulama',
    provider: 'Hexclave (Stack Auth)',
    accent: 'meyve',
    state: 'up',
    uptime: '100',
    days: makeDays(),
  },
  {
    id: 'email',
    name: 'E-posta iletimi',
    provider: 'Resend',
    accent: 'sut',
    state: 'up',
    uptime: '100',
    days: makeDays(),
  },
]

export const providers: ProviderStatus[] = [
  { name: 'Vercel', note: 'Web barındırma', url: 'https://www.vercel-status.com', state: 'up' },
  { name: 'Neon', note: 'Veritabanı', url: 'https://neonstatus.com', state: 'up' },
  {
    name: 'Google Cloud',
    note: 'Sunucu altyapısı',
    url: 'https://status.cloud.google.com',
    state: 'up',
  },
  {
    name: 'Microsoft Azure',
    note: 'Yapay zekâ servisleri',
    url: 'https://azure.status.microsoft',
    state: 'up',
  },
]

export const incidents: Incident[] = [
  {
    id: 'db-2026-07-29',
    title: 'Veritabanı bağlantı kesintisi',
    date: '29 Temmuz 2026',
    duration: '29 dakika',
    resolved: true,
    affected: ['Uygulama sunucusu', 'Veritabanı'],
    updates: [
      {
        time: '14:12',
        text: 'Havuzlu bağlantı ucunda oluşan bir yapılandırma sorunu uygulama sunucusunu etkilemeye başladı; inceliyoruz.',
      },
      {
        time: '14:41',
        text: 'Sorunun kaynağı bulundu ve giderildi. Bağlantılar normale döndü, tüm servisler çalışıyor.',
      },
    ],
  },
]

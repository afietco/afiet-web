import type { CheckResult } from '~~/server/utils/statusStore'

/**
 * Durum kontrol probları. İki tür kaynak var:
 *
 * 1) Kendi uçlarımız (doğrudan HTTP):
 *    - api  → Cloud Run prod /livez (süreç sağlığı)
 *    - db   → Cloud Run prod /readyz (şema doğrulaması; Neon bağlantısını kanıtlar)
 *      (/healthz KULLANILMAZ: run.app'te o yolu Google Frontend yutuyor.)
 *    - web  → https://afiet.co (bu fonksiyon da orada koşar; platform komple
 *      çökerse cron da koşmaz ve şeritte 'veri yok' boşluğu kalır - bu bilinçli.)
 *    - auth/email → sağlayıcı API host'una erişilebilirlik (401/400 = ayakta).
 *
 * 2) Sağlayıcı durum sayfaları (resmi API'ler):
 *    - Vercel: Statuspage JSON (indicator)
 *    - Neon: status.io herkese açık API (status_overall.status_code)
 *    - Google Cloud: incidents.json (bitişi olmayan olaylar)
 *    - Azure: RSS akışı (yalnız bizi ilgilendiren servis/bölge metinleri)
 *
 * Afi bileşeni Azure sağlayıcı durumundan türetilir (ajan çağrısı ücretli
 * olduğundan canlı prob yapılmaz).
 */

const API_BASE = 'https://app-api-prod-f7cnieuuza-ew.a.run.app'
const TIMEOUT_MS = 8000
/** Bu eşiğin üstü 'yavaşlama' sayılır (kesinti değil). */
const SLOW_MS = 4000

interface ProbeOutcome {
  state: CheckResult['state']
  latencyMs: number | null
  detail: string
}

async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: 'follow' })
  } finally {
    clearTimeout(timer)
  }
}

/** Uç erişilebilir mi? `okBelow500` açıksa 4xx de "ayakta" sayılır (auth isteyen API'ler). */
async function httpProbe(url: string, okBelow500 = false): Promise<ProbeOutcome> {
  const startedAt = Date.now()
  try {
    const res = await timedFetch(url)
    const latencyMs = Date.now() - startedAt
    const alive = okBelow500 ? res.status < 500 : res.ok
    if (!alive) return { state: 'down', latencyMs, detail: `HTTP ${res.status}` }
    if (latencyMs > SLOW_MS) return { state: 'degraded', latencyMs, detail: `yavaş yanıt (${latencyMs} ms)` }
    return { state: 'up', latencyMs, detail: '' }
  } catch (err) {
    const timeout = err instanceof Error && err.name === 'AbortError'
    return {
      state: 'down',
      latencyMs: null,
      detail: timeout ? `zaman aşımı (${TIMEOUT_MS} ms)` : 'bağlantı hatası',
    }
  }
}

async function vercelProbe(): Promise<ProbeOutcome> {
  try {
    const res = await timedFetch('https://www.vercel-status.com/api/v2/status.json')
    const body = (await res.json()) as { status?: { indicator?: string } }
    const indicator = body.status?.indicator ?? 'none'
    if (indicator === 'none') return { state: 'up', latencyMs: null, detail: '' }
    if (indicator === 'minor') return { state: 'degraded', latencyMs: null, detail: 'Vercel: minor incident' }
    return { state: 'down', latencyMs: null, detail: `Vercel: ${indicator} incident` }
  } catch {
    return { state: 'degraded', latencyMs: null, detail: 'durum sayfası okunamadı' }
  }
}

async function neonProbe(): Promise<ProbeOutcome> {
  try {
    // neonstatus.com'un status.io sayfası; 100=çalışıyor, 300/400=aksama, 500+=kesinti
    const res = await timedFetch('https://api.status.io/1.0/status/6878fc85709daa75be6c7e3c')
    const body = (await res.json()) as {
      result?: { status_overall?: { status_code?: number; status?: string } }
    }
    const code = body.result?.status_overall?.status_code ?? 100
    const label = body.result?.status_overall?.status ?? ''
    if (code <= 200) return { state: 'up', latencyMs: null, detail: '' }
    if (code < 500) return { state: 'degraded', latencyMs: null, detail: `Neon: ${label}` }
    return { state: 'down', latencyMs: null, detail: `Neon: ${label}` }
  } catch {
    return { state: 'degraded', latencyMs: null, detail: 'durum sayfası okunamadı' }
  }
}

interface GcpIncident {
  end?: string
  severity?: string
  affected_products?: { title?: string }[]
  currently_affected_locations?: { id?: string }[]
}

async function gcpProbe(): Promise<ProbeOutcome> {
  try {
    const res = await timedFetch('https://status.cloud.google.com/incidents.json')
    const incidents = (await res.json()) as GcpIncident[]
    // Yalnız bizi ilgilendirenler: bitmemiş + (Cloud Run veya europe-west1)
    const relevant = incidents.filter((i) => {
      if (i.end) return false
      const products = (i.affected_products ?? []).map((p) => p.title ?? '')
      const locations = (i.currently_affected_locations ?? []).map((l) => l.id ?? '')
      return (
        products.some((p) => /cloud run|compute|networking/i.test(p)) ||
        locations.includes('europe-west1')
      )
    })
    if (relevant.length === 0) return { state: 'up', latencyMs: null, detail: '' }
    const severe = relevant.some((i) => i.severity === 'high')
    return {
      state: severe ? 'down' : 'degraded',
      latencyMs: null,
      detail: `Google Cloud: ${relevant.length} aktif olay`,
    }
  } catch {
    return { state: 'degraded', latencyMs: null, detail: 'durum sayfası okunamadı' }
  }
}

async function azureProbe(): Promise<ProbeOutcome> {
  try {
    const res = await timedFetch('https://azure.status.microsoft/en-us/status/feed/')
    const xml = await res.text()
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
    // Global akıştan yalnız bizi ilgilendirenler: kullandığımız servisler ya da bölge
    const relevant = items.filter((item) =>
      /west europe|azure openai|ai foundry|cognitive/i.test(item),
    )
    if (relevant.length === 0) return { state: 'up', latencyMs: null, detail: '' }
    return {
      state: 'degraded',
      latencyMs: null,
      detail: `Azure: ${relevant.length} aktif duyuru`,
    }
  } catch {
    return { state: 'degraded', latencyMs: null, detail: 'durum sayfası okunamadı' }
  }
}

/** Tüm kontrolleri koşturur; tek probun hatası turu düşürmez. */
export async function runAllProbes(): Promise<CheckResult[]> {
  const [api, db, web, auth, email, vercel, neonSt, gcp, azure] = await Promise.all([
    httpProbe(`${API_BASE}/livez`),
    httpProbe(`${API_BASE}/readyz`),
    httpProbe('https://afiet.co'),
    httpProbe('https://api.stack-auth.com/api/v1/projects/current', true),
    httpProbe('https://api.resend.com/emails', true),
    vercelProbe(),
    neonProbe(),
    gcpProbe(),
    azureProbe(),
  ])

  return [
    { component: 'api', ...api },
    { component: 'db', ...db },
    { component: 'web', ...web },
    // Afi = Azure sağlayıcı durumu (canlı ajan çağrısı ücretli, prob yapılmaz)
    { component: 'afi', ...azure },
    { component: 'auth', ...auth },
    { component: 'email', ...email },
    { component: 'provider:vercel', ...vercel },
    { component: 'provider:neon', ...neonSt },
    { component: 'provider:gcp', ...gcp },
    { component: 'provider:azure', ...azure },
  ]
}

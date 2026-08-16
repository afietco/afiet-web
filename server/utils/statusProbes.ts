import type { CheckResult, ProbeEvidence } from '~~/server/utils/statusStore'

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
/** Başarısız yoklamayı tekrarlamadan önce beklenen süre (bkz. httpProbeRetried). */
const RETRY_DELAY_MS = 2000

interface ProbeOutcome {
  state: CheckResult['state']
  latencyMs: number | null
  detail: string
  evidence?: ProbeEvidence
}

/** Gövdeden okunacak en fazla karakter: teşhise yeter, maili şişirmez. */
const SNIPPET = 300

/**
 * Yanıt gövdesini teşhis edilebilir tek satıra indirger.
 *
 * Bu iş kesintinin sebebini söyleyen tek ücretsiz kaynaktır: kendi
 * `/readyz`imiz JSON'da `reason` yazar ("db ping başarısız", "şema
 * çözümlenemedi"), Cloud Run kendi 503'ünde neden bağlanamadığını cümleyle
 * söyler, Vercel hata kodunu (FUNCTION_INVOCATION_TIMEOUT…) sayfaya basar.
 * Eskiden bunların hepsini okumadan atıyorduk ve elimizde yalnız "HTTP 503"
 * kalıyordu.
 */
async function readSnippet(res: Response): Promise<string> {
  try {
    const raw = (await res.text()).slice(0, 4000)
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, SNIPPET)
  } catch {
    return ''
  }
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
    if (!alive) {
      return {
        state: 'down',
        latencyMs,
        detail: `HTTP ${res.status}`,
        evidence: {
          status: res.status,
          bodySnippet: await readSnippet(res),
          server: res.headers.get('server') ?? undefined,
        },
      }
    }
    if (latencyMs > SLOW_MS) {
      return {
        state: 'degraded',
        latencyMs,
        detail: `yavaş yanıt (${latencyMs} ms)`,
        evidence: { status: res.status, server: res.headers.get('server') ?? undefined },
      }
    }
    return { state: 'up', latencyMs, detail: '' }
  } catch (err) {
    const timeout = err instanceof Error && err.name === 'AbortError'
    // Ağ katmanı hatasında gövde yoktur; teşhisin tek dayanağı hatanın kendisi
    // olur (DNS, TLS, bağlantı reddi ayrı sebeplere işaret eder).
    const raw = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    return {
      state: 'down',
      latencyMs: null,
      detail: timeout ? `zaman aşımı (${TIMEOUT_MS} ms)` : 'bağlantı hatası',
      evidence: {
        networkError: timeout ? `zaman aşımı (${TIMEOUT_MS} ms)` : raw.slice(0, SNIPPET),
      },
    }
  }
}

/**
 * Sağlayıcının kendi cümlesi. Bir olay varsa maildeki "muhtemel sebep"
 * bölümünün EN GÜÇLÜ kaynağı budur: kendi tarafımızdaki 503'ün neden
 * olduğunu tahmin etmek yerine sağlayıcının ağzından okuruz.
 * Yalnız olay varken çağrılır (normal turda fazladan istek yok).
 */
async function vercelIncidentText(): Promise<string | undefined> {
  try {
    const res = await timedFetch('https://www.vercel-status.com/api/v2/incidents/unresolved.json')
    const body = (await res.json()) as {
      incidents?: { name?: string; incident_updates?: { body?: string }[] }[]
    }
    const first = body.incidents?.[0]
    if (!first) return undefined
    const update = first.incident_updates?.[0]?.body ?? ''
    return [first.name, update].filter(Boolean).join(' - ').slice(0, 400)
  } catch {
    return undefined
  }
}

/**
 * Kendi uçlarımız için tek seferlik tekrar.
 *
 * NEDEN (16 Ağu 2026, ölçümle): durum sayfasındaki üç "veritabanı kesintisi"
 * kaydının üçü de yaşanmamıştı. Neon uykudan kalkarken ilk bağlantı 3,5-4
 * saniye sürüyor, o anda giden sağlık kontrolü düşüyor, bir saniye sonraki
 * istek 200 dönüyordu. Tek bir başarısız yoklama bir kesinti DEĞİLDİR.
 *
 * İki saniye bekleyip bir kez daha sorarız: gerçek kesinti ikisinde de düşer
 * ve uyarı yine AYNI turda çıkar (saniyeler fark eder), gelip geçen takılma
 * ise sessizce geçer ve 90 günlük şeridi kirletmez.
 *
 * Sağlayıcı durum sayfalarına uygulanmaz: onlar yoklama değil, okuma.
 */
async function httpProbeRetried(url: string, okBelow500 = false): Promise<ProbeOutcome> {
  const first = await httpProbe(url, okBelow500)
  if (first.state !== 'down') return first

  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
  const second = await httpProbe(url, okBelow500)
  if (second.state !== 'down') {
    console.warn(`[durum] ${url}: ilk yoklama düştü (${first.detail}), tekrar geçti`)
  }
  return second
}

async function vercelProbe(): Promise<ProbeOutcome> {
  try {
    const res = await timedFetch('https://www.vercel-status.com/api/v2/status.json')
    const body = (await res.json()) as { status?: { indicator?: string; description?: string } }
    const indicator = body.status?.indicator ?? 'none'
    if (indicator === 'none') return { state: 'up', latencyMs: null, detail: '' }
    const evidence: ProbeEvidence = {
      incident: (await vercelIncidentText()) ?? body.status?.description,
    }
    if (indicator === 'minor') {
      return { state: 'degraded', latencyMs: null, detail: 'Vercel: minor incident', evidence }
    }
    return { state: 'down', latencyMs: null, detail: `Vercel: ${indicator} incident`, evidence }
  } catch {
    // Sağlayıcının durum sayfasına ulaşamamak SAĞLAYICININ arızası değildir;
    // şerit sarıya döner ama uyarı üretmez (bkz. statusAlerts > gurultuMu).
    return { state: 'degraded', latencyMs: null, detail: 'durum sayfası okunamadı' }
  }
}

async function neonProbe(): Promise<ProbeOutcome> {
  try {
    // neonstatus.com'un status.io sayfası; 100=çalışıyor, 300/400=aksama, 500+=kesinti
    const res = await timedFetch('https://api.status.io/1.0/status/6878fc85709daa75be6c7e3c')
    const body = (await res.json()) as {
      result?: {
        status_overall?: { status_code?: number; status?: string }
        incidents?: { name?: string; messages?: { details?: string }[] }[]
      }
    }
    const code = body.result?.status_overall?.status_code ?? 100
    const label = body.result?.status_overall?.status ?? ''
    if (code <= 200) return { state: 'up', latencyMs: null, detail: '' }
    const olay = body.result?.incidents?.[0]
    const evidence: ProbeEvidence = {
      incident: olay
        ? [olay.name, olay.messages?.[0]?.details].filter(Boolean).join(' - ').slice(0, 400)
        : label,
    }
    if (code < 500) return { state: 'degraded', latencyMs: null, detail: `Neon: ${label}`, evidence }
    return { state: 'down', latencyMs: null, detail: `Neon: ${label}`, evidence }
  } catch {
    return { state: 'degraded', latencyMs: null, detail: 'durum sayfası okunamadı' }
  }
}

interface GcpIncident {
  end?: string
  severity?: string
  external_desc?: string
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
      evidence: { incident: relevant[0]?.external_desc?.slice(0, 400) },
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
    const baslik = relevant[0]?.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ''
    return {
      state: 'degraded',
      latencyMs: null,
      detail: `Azure: ${relevant.length} aktif duyuru`,
      evidence: {
        incident: baslik
          .replace(/<!\[CDATA\[|\]\]>/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 400),
      },
    }
  } catch {
    return { state: 'degraded', latencyMs: null, detail: 'durum sayfası okunamadı' }
  }
}

/** Tüm kontrolleri koşturur; tek probun hatası turu düşürmez. */
export async function runAllProbes(): Promise<CheckResult[]> {
  const [api, db, web, auth, email, vercel, neonSt, gcp, azure] = await Promise.all([
    httpProbeRetried(`${API_BASE}/livez`),
    httpProbeRetried(`${API_BASE}/readyz`),
    httpProbeRetried('https://afiet.co'),
    httpProbeRetried('https://api.stack-auth.com/api/v1/projects/current', true),
    httpProbeRetried('https://api.resend.com/emails', true),
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

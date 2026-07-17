/**
 * Birinci-taraf analitik beacon'ı. Her sayfa görüntülemede (ilk yükleme + SPA
 * gezinmeleri) ve sayfadan ayrılırken (kalış süresi) `POST /api/track`e gönderir.
 *
 * Gizlilik: dış istek yok; yalnız kendi origin'imize. Ziyaretçi/oturum kimliği
 * sunucuda birinci-taraf httpOnly çerezle tutulur (istemci okumaz/yazmaz). DNT
 * sinyaline ve `afiet_no_track` opt-out'una saygı gösterir.
 *
 * Yalnız production host'larında (runtimeConfig.public.analyticsDomains) çalışır;
 * dev/preview/staging kapalı — paylaşılan Neon kirlenmez. GÖNDERİM yalnız KVKK
 * onayı verilmişse yapılır (`afiet_analytics_consent === 'accepted'`, bildirimi
 * `CookieNotice.vue` yazar); "Kabul et" anında geçerli sayfayı sayar.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return

  const domains = String(useRuntimeConfig().public.analyticsDomains || '')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)

  // Toplama bu host'ta uygulanabilir mi? (DNT'ye saygı; onaydan bağımsız.)
  const applicable = () => {
    if (!domains.includes(location.hostname)) return false
    if (navigator.doNotTrack === '1' || (window as unknown as { doNotTrack?: string }).doNotTrack === '1') return false
    return true
  }
  if (!applicable()) return

  // KVKK: yalnız açık onayla gönderilir (opt-in).
  const consentOk = () => {
    try {
      return localStorage.getItem('afiet_analytics_consent') === 'accepted'
    } catch {
      return false
    }
  }

  const ENDPOINT = '/api/track'
  const initialReferrer = document.referrer || ''
  const router = useRouter()

  let currentPath = ''
  let enterTime = 0
  let engSent = true

  const utm = (): Record<string, string> => {
    const q = new URLSearchParams(location.search)
    const o: Record<string, string> = {}
    for (const k of ['source', 'medium', 'campaign', 'term', 'content']) {
      const v = q.get(`utm_${k}`)
      if (v) o[k] = v.slice(0, 120)
    }
    return o
  }

  const send = (payload: Record<string, unknown>, unload = false) => {
    if (!consentOk()) return
    try {
      const body = JSON.stringify(payload)
      if (unload && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
      } else {
        void fetch(ENDPOINT, {
          method: 'POST',
          body,
          keepalive: true,
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
        }).catch(() => {})
      }
    } catch {
      /* yut */
    }
  }

  /** Ayrılan sayfanın kalış süresini gönder (1.5sn altını sayma). */
  const flushEngagement = (unload = false) => {
    if (engSent || !currentPath) return
    engSent = true
    const ms = Date.now() - enterTime
    if (ms < 1500) return
    send({ e: 'eng', p: currentPath, d: ms }, unload)
  }

  const pageview = (path: string) => {
    flushEngagement()
    currentPath = path
    enterTime = Date.now()
    engSent = false
    send({ e: 'pv', p: path, t: document.title, r: initialReferrer, u: utm(), w: window.screen?.width })
  }

  // İlk yükleme (title kesinleşsin diye mount sonrası) + SPA gezinmeleri.
  nuxtApp.hook('app:mounted', () => {
    if (!currentPath) pageview(router.currentRoute.value.path)
  })
  router.afterEach((to) => {
    if (to.path !== currentPath) pageview(to.path)
  })

  // Sayfadan ayrılış / sekme gizlenmesi: kalış süresini gönder.
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEngagement(true)
  })
  addEventListener('pagehide', () => flushEngagement(true))

  // "Kabul et" (CookieNotice): onaydan sonra geçerli sayfayı hemen say.
  addEventListener('afiet:analytics-consent', () => {
    currentPath = ''
    engSent = true
    pageview(router.currentRoute.value.path)
  })
})

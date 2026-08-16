/**
 * Birinci-taraf analitik beacon'ı. Her sayfa görüntülemede (ilk yükleme + SPA
 * gezinmeleri) ve sayfadan ayrılırken (kalış süresi) `POST /api/track`e gönderir.
 *
 * Gizlilik: dış istek yok; yalnız kendi origin'imize. Ziyaretçi/oturum kimliği
 * sunucuda birinci-taraf httpOnly çerezle tutulur (istemci okumaz/yazmaz).
 * Tarayıcının DNT sinyaline saygı gösterir.
 *
 * NOT: burada bir zamanlar `afiet_no_track` opt-out'u anlatılıyordu; kodda
 * öyle bir kontrol hiç olmadı. Vazgeçmenin iki gerçek yolu var: onay
 * bildirimindeki "Reddet" (toplama hiç başlamaz) ve DNT.
 *
 * Yalnız production host'larında (runtimeConfig.public.analyticsDomains) çalışır;
 * dev/preview/staging kapalı - paylaşılan Neon kirlenmez. GÖNDERİM yalnız KVKK
 * onayı verilmişse yapılır (`afiet_analytics_consent === 'accepted'`, bildirimi
 * `CookieNotice.vue` yazar); "Kabul et" anında geçerli sayfayı sayar.
 *
 * Sayfa görüntülemenin dışında dört ürün olayı daha var: destek merkezinin
 * `destek_oy` ve `destek_arama`sı, bir de web dönüşümleri `magaza_tik`
 * (StoreBadges) ve `bulten_kayit` (BultenForm). Hepsi `$afietEvent(...)` ile
 * aynı kapılardan geçer, ayrı bir uç ya da ikinci bir onay mekanizması YOKTUR.
 *
 * Reklam tıklama kimliği (Google `gclid` / `gbraid` / `wbraid`): sayfa ilk
 * açıldığında URL'den okunur, girişteki sayfa görüntülemesiyle sunucuya gider
 * ve orada dönüşüm olaylarına bağlanır (Google Ads'e "offline conversion"
 * olarak elle yüklenir). Google'ın script'i ya da çerezi YOK; kimlik yalnız
 * onay verilmişse gönderilir. `$afietClickId()` mağaza bağlantısının Play
 * referrer'ına aynı kimliği eklemek için vardır ve o da onaya bakar.
 */
type SupportEvent = 'destek_oy' | 'destek_arama' | 'magaza_tik' | 'bulten_kayit'
type ClickId = { k: 'gclid' | 'gbraid' | 'wbraid'; v: string }

export default defineNuxtPlugin((nuxtApp) => {
  // Sunucuda ve toplamanın kapalı olduğu host'larda bile sağlayıcı DÖNER:
  // çağıran bileşenler `$afietEvent` var mı diye kontrol etmek zorunda kalmasın.
  // İmza sessiz sürümde de birebir aynı olmalı, yoksa Nuxt iki dönüş tipini
  // birleştirir ve çağrı yerleri tip hatası verir.
  const sessiz = {
    provide: {
      afietEvent: (kind: SupportEvent, data: { p: string; v: string }) => {
        void kind
        void data
      },
      afietClickId: (): ClickId | null => null,
    },
  }
  if (import.meta.server) return sessiz

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
  if (!applicable()) return sessiz

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

  // Reklam tıklama kimliği: yalnız ilk yüklemedeki URL'den, bir kez.
  const CLICK_RE = /^[A-Za-z0-9_-]{10,200}$/
  const clickId: ClickId | null = (() => {
    const q = new URLSearchParams(location.search)
    for (const k of ['gclid', 'gbraid', 'wbraid'] as const) {
      const v = q.get(k)
      if (v && CLICK_RE.test(v)) return { k, v }
    }
    return null
  })()

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
    send({ e: 'pv', p: path, t: document.title, r: initialReferrer, u: utm(), g: clickId ?? undefined, w: window.screen?.width })
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

  /**
   * Destek merkezinin iki ürün olayı. Serbest metin (arama sorgusu) 120
   * karakterde kesilir ve sunucu tarafında da ayrıca sınırlanır; sayfa
   * görüntülemeyle aynı onay kapısından geçer.
   */
  const afietEvent = (kind: SupportEvent, data: { p: string; v: string }) => {
    if (!data.p || !data.v) return
    send({ e: kind, p: data.p, v: data.v.slice(0, 120) })
  }

  /** Mağaza bağlantıları için tıklama kimliği; onay yoksa null (kimlik hiçbir yere taşınmaz). */
  const afietClickId = (): ClickId | null => (consentOk() ? clickId : null)

  return { provide: { afietEvent, afietClickId } }
})

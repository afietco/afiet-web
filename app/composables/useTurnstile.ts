/**
 * Cloudflare Turnstile, "Afi'ye sor" paneli için.
 *
 * YÜKLEME İLKESİ: script sayfa açılışında DEĞİL, panele ilk dokunulduğunda
 * yüklenir. Bu sitenin bugüne kadar hiç üçüncü taraf script'i yoktu; SSS'yi
 * okuyup çıkan bir ziyaretçi Cloudflare ile hiç temas etmesin istiyoruz.
 * Gizlilik metnindeki taahhüt de bu.
 *
 * Site anahtarı GİZLİ DEĞİLDİR, HTML'e basılır. Secret yalnızca backend'de
 * durur ve doğrulama yalnızca orada yapılır (tarayıcıdan asla).
 *
 * Anahtar boşken her şey atlanır: dev, preview ve smoke Cloudflare'e
 * erişemeden çalışmaya devam eder.
 */

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id: string) => void
  execute: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// Tek seferlik, hafızada tutulan yükleme sözü: panel birkaç kez etkileşim
// alsa da script bir kez inar.
let loading: Promise<TurnstileApi> | null = null

function loadScript(): Promise<TurnstileApi> {
  if (loading) return loading
  loading = new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile)
    const s = document.createElement('script')
    s.src = SCRIPT_URL
    s.async = true
    s.defer = true
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile yok')))
    s.onerror = () => reject(new Error('turnstile yüklenemedi'))
    document.head.appendChild(s)
  })
  return loading
}

export function useTurnstile() {
  const config = useRuntimeConfig()
  const siteKey = String(config.public.turnstileSiteKey || '')
  const enabled = siteKey !== ''

  const host = ref<HTMLElement | null>(null)
  const challenging = ref(false)
  let widgetId: string | null = null
  // warmUp uçuştayken ikinci bir çağrı ikinci bir widget render etmesin.
  let warming: Promise<void> | null = null
  // Turnstile sonucu render sırasında verilen callback'lerden gelir, execute'un
  // dönüşünden değil. Bekleyen çözücüyü burada tutup oradan tetikliyoruz.
  let settle: ((token: string) => void) | null = null

  const finish = (token: string) => {
    const done = settle
    settle = null
    done?.(token)
  }

  /** İlk etkileşimde çağrılır; script'i ve widget'ı ısıtır. */
  function warmUp(): Promise<void> {
    if (!enabled || widgetId || !host.value) return Promise.resolve()
    if (warming) return warming
    warming = renderWidget().finally(() => (warming = null))
    return warming
  }

  async function renderWidget() {
    try {
      const api = await loadScript()
      widgetId = api.render(host.value, {
        sitekey: siteKey,
        action: 'turnstile-spin-v2',
        // Görünmez ve yalnız gerekince görünür; bir zorluk gösterilecekse
        // kutu yerinde açılır (gizli kaptaki widget çözülemez ve kilitlenir).
        // Görünmezlik appearance ile sağlanır. size:'invisible' ARTIK GEÇERLİ
        // DEĞİL ve geçersiz seçenek widget'ı sessizce bozuyor: token hiç
        // üretilmiyor, backend missing-input-response ile reddediyor.
        appearance: 'interaction-only',
        execution: 'execute',
        language: 'tr',
        theme: 'light',
        retry: 'never',
        callback: (token: string) => finish(token),
        'error-callback': () => finish(''),
        'expired-callback': () => finish(''),
        'timeout-callback': () => finish(''),
      })
    } catch {
      // Eklenti, kurumsal vekil ya da ağ engeli. Soru yine sorulabilir:
      // bilet, IP penceresi ve honeypot ayakta. Bkz. getToken.
      widgetId = null
    }
  }

  /**
   * Bir soru için tek kullanımlık token üretir.
   *
   * Token alınamazsa boş string döner ve soru yine gönderilir. Turnstile'ı
   * zorunlu kılmak, gizlilik eklentisi kullanan herkes için paneli kırardı;
   * güvenlik tarafı backend'de duruyor (token'sız istek çok daha dar bir
   * kotaya tabi tutulabilir).
   */
  async function getToken(): Promise<string> {
    if (!enabled) return ''
    if (!widgetId) await warmUp()
    if (!widgetId || !window.turnstile) return ''

    const api = window.turnstile
    const id = widgetId
    challenging.value = true
    try {
      return await new Promise<string>((resolve) => {
        let timer: ReturnType<typeof setTimeout>
        settle = (token: string) => {
          clearTimeout(timer)
          resolve(typeof token === 'string' ? token : '')
        }
        // Cloudflare hiç geri dönmezse panel kilitlenmesin.
        timer = setTimeout(() => finish(''), 20_000)
        try {
          // Token'lar tek kullanımlık: her soru için sıfırla ve yeniden çalıştır.
          api.reset(id)
          api.execute(id)
        } catch {
          finish('')
        }
      })
    } finally {
      challenging.value = false
    }
  }

  return { enabled, host, challenging, warmUp, getToken }
}

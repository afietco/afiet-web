import { askAfi } from '~/data/content'
import { frameJson, readSse } from '~/utils/askAfiStream'

/**
 * "Afi'ye sor" panelinin durum makinesi ve akış istemcisi.
 *
 * ISR UYARISI: buradaki hiçbir çağrı setup() içinde çalıştırılmaz ve $fetch
 * dışında useFetch KULLANILMAZ. Ana sayfa `isr: 60` ile önbelleklenir; setup'ta
 * atılan bir istek tek bir ziyaretçinin biletini/cevabını 60 saniye boyunca
 * herkese servis edilen HTML'e gömerdi. (nuxt.config.ts'teki swr uyarısıyla
 * aynı cinsten bir tuzak.)
 *
 * Bağlam sunucuda tutulur: istemci geçmiş göndermez. Geçmişi istemci yollasaydı
 * sahte bir "afi şunu kabul etmişti" turu uydurup guardrail'i delebilirdi.
 */

export type AskState = 'idle' | 'sending' | 'streaming' | 'error' | 'limit' | 'capped' | 'soon'
export type AskMood = 'idle' | 'listening' | 'thinking' | 'speaking'

export type AskSource = { title: string; url: string }
export type AskTurn = {
  id: number
  role: 'sen' | 'afi'
  text: string
  streaming?: boolean
  sources?: AskSource[]
}

const MAX_TURNS = 6
const FIRST_TOKEN_TIMEOUT_MS = 20_000
const TOTAL_TIMEOUT_MS = 90_000

export function useAskAfi() {
  const config = useRuntimeConfig()
  const apiUrl = String(config.public.askApiUrl || '')
  // 'mock': gerçek backend olmadan paneli çalışır görmek için (yerel + smoke).
  const mockMode = apiUrl === 'mock'
  const enabled = apiUrl !== ''

  const turnstile = useTurnstile()

  const state = ref<AskState>('idle')
  const turns = ref<AskTurn[]>([])
  const draft = ref('')
  const focused = ref(false)
  const company = ref('') // honeypot
  const announce = ref('') // sr-only canlı bölge (token token DEĞİL)
  // Görünen hata metni. 'error' durumunun tek bir sabit cümlesi yok: zaman
  // aşımı, doğrulama ve genel arıza farklı şeyler ve ziyaretçiye farklı
  // görünmeli.
  const errorText = ref(askAfi.error)
  const usedChips = ref<string[]>([])
  const turnsLeft = ref(MAX_TURNS)

  let controller: AbortController | null = null
  let seq = 0
  let lastQuestion = ''

  // Bilet bellekte tutulur, sayfaya GÖMÜLMEZ: ana sayfa 60 sn ISR ile
  // önbelleklendiği için gömülü bilet bütün ziyaretçilere aynı gelir ve
  // hiçbir şey kanıtlamaz. Süresi dolmadan 30 sn önce tazelenir.
  let ticket: { value: string; exp: number } | null = null

  async function getTicket(force = false): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    if (!force && ticket && ticket.exp - now > 30) return ticket.value
    // setup() içinde DEĞİL, yalnız etkileşimde çağrılır; useFetch de
    // kullanılmaz, yoksa bilet ISR HTML'ine pişerdi.
    const res = await $fetch<{ ticket?: string; expiresAt?: number; status?: string }>(
      '/api/afi/ticket',
      { method: 'GET' },
    )
    if (!res?.ticket || !res.expiresAt) throw askError('soon')
    ticket = { value: res.ticket, exp: res.expiresAt }
    return ticket.value
  }

  // Captcha VARSAYILAN OLARAK KAPALIDIR. Backend "kısa bir doğrulama gerekiyor"
  // dediğinde açılır (429 + needsVerification) ve aynı soru yeniden gönderilir.
  // İlk sorunun önüne doğrulama koymak, bu panelde bot trafiğinden çok
  // yarıda bırakılmış sohbete mal oluyor.
  const verifying = ref(false)

  /** İlk etkileşimde yalnız bilet ısıtılır; Turnstile'a dokunulmaz. */
  function warmUp() {
    if (mockMode) return
    void getTicket().catch(() => {})
  }

  function askError(code: string) {
    const e = new Error('ask: ' + code) as Error & { askCode?: string }
    e.askCode = code
    return e
  }

  const answeredCount = computed(() => turns.value.filter((t) => t.role === 'afi' && !t.streaming).length)
  const busy = computed(() => state.value === 'sending' || state.value === 'streaming')
  const canSend = computed(() => draft.value.trim().length >= 4 && !busy.value && state.value !== 'capped' && state.value !== 'limit')

  /** Afi'nin ruh hâli. Hata/sınır/kota durumları bilinçli olarak idle'a düşer:
   *  Afi'nin üzgün hâli yoktur (BRAND.md > Logo). */
  const mood = computed<AskMood>(() => {
    if (state.value === 'streaming') return 'speaking'
    if (state.value === 'sending') return 'thinking'
    if (focused.value) return 'listening'
    return 'idle'
  })

  const remainingChips = computed(() => askAfi.chips.filter((c) => !usedChips.value.includes(c)))

  function reset() {
    controller?.abort()
    controller = null
  }

  function stop() {
    controller?.abort()
    controller = null
    const last = turns.value[turns.value.length - 1]
    if (last?.role === 'afi') last.streaming = false
    state.value = 'idle'
  }

  async function ask(questionRaw: string, fromChip?: string) {
    const question = questionRaw.replace(/\s+/g, ' ').trim().slice(0, 280)
    if (question.length < 4 || busy.value) return
    if (company.value) return // honeypot dolu: sessizce yut
    if (answeredCount.value >= MAX_TURNS) {
      state.value = 'capped'
      return
    }

    lastQuestion = question
    if (fromChip && !usedChips.value.includes(fromChip)) usedChips.value.push(fromChip)
    draft.value = ''

    turns.value.push({ id: ++seq, role: 'sen', text: question })
    const answer: AskTurn = { id: ++seq, role: 'afi', text: '', streaming: true }
    turns.value.push(answer)

    state.value = 'sending'
    announce.value = askAfi.thinking

    controller = new AbortController()
    const signal = controller.signal
    // İptalin nedenini state'ten okumak kırılgan: zaman aşımı da stop() da
    // abort eder. Nedeni burada açıkça taşırız.
    let timedOut = false
    const totalTimer = setTimeout(() => {
      timedOut = true
      controller?.abort()
    }, TOTAL_TIMEOUT_MS)
    // Gözcü, istek TELE ÇIKTIĞINDA başlar; bilet ve captcha beklemesi bu
    // bütçeyi yemez. Aksi halde captcha 20 saniyeyi doldurunca istek daha
    // gönderilmeden iptal oluyordu.
    let firstTokenTimer: ReturnType<typeof setTimeout> | null = null
    const armFirstTokenWatchdog = () => {
      if (firstTokenTimer) return
      firstTokenTimer = setTimeout(() => {
        timedOut = true
        controller?.abort()
      }, FIRST_TOKEN_TIMEOUT_MS)
    }

    const clearFirstToken = () => {
      if (firstTokenTimer) clearTimeout(firstTokenTimer)
      firstTokenTimer = null
    }

    const onDelta = (t: string) => {
      if (state.value === 'sending') {
        state.value = 'streaming'
        announce.value = askAfi.answering
        clearFirstToken()
      }
      answer.text += t
    }

    try {
      if (mockMode) await runMock(question, onDelta, signal)
      else await runReal(question, answer, onDelta, signal, armFirstTokenWatchdog)

      answer.streaming = false
      // Tamamlanan cevabı ekran okuyucuya BİR KEZ duyur (token token değil).
      announce.value = answer.text
      turnsLeft.value = Math.max(0, MAX_TURNS - answeredCount.value)
      state.value = answeredCount.value >= MAX_TURNS ? 'capped' : 'idle'
      if (state.value === 'capped') announce.value = askAfi.cap
    } catch (err) {
      answer.streaming = false
      if (signal.aborted && timedOut) {
        // Zaman aşımı: "Afi düşünceye daldı", yeniden sorulabilir.
        failWith('slow')
        turns.value = turns.value.filter((t) => t.id !== answer.id)
      } else if (signal.aborted) {
        // stop() ya da unmount: sessiz çık, yazılan kısım ekranda kalsın.
        if (!answer.text) turns.value = turns.value.filter((t) => t.id !== answer.id)
      } else {
        const code = (err as { askCode?: string })?.askCode
        if (code === 'rate_limited') failWith('limit')
        else if (code === 'soon') failWith('soon')
        else if (code === 'captcha') failWith('captcha')
        else failWith('error')
        // Cevapsız balonu bırakma; hata satırı zaten durumu anlatıyor.
        turns.value = turns.value.filter((t) => t.id !== answer.id)
      }
    } finally {
      clearTimeout(totalTimer)
      clearFirstToken()
      controller = null
    }
  }

  function failWith(kind: 'error' | 'limit' | 'soon' | 'slow' | 'captcha') {
    if (kind === 'captcha') {
      state.value = 'error'
      errorText.value = askAfi.captchaFailed
      announce.value = askAfi.captchaFailed
      return
    }
    if (kind === 'limit') {
      state.value = 'limit'
      announce.value = askAfi.limit
    } else if (kind === 'soon') {
      state.value = 'soon'
      announce.value = askAfi.soon
    } else {
      state.value = 'error'
      errorText.value = kind === 'slow' ? askAfi.slow : askAfi.error
      announce.value = errorText.value
    }
  }

  function retry() {
    if (!lastQuestion) return
    // Başarısız tur kotayı yemez: son "sen" balonunu da geri alıp yeniden sor.
    const idx = turns.value.map((t) => t.role).lastIndexOf('sen')
    if (idx !== -1) turns.value.splice(idx, 1)
    state.value = 'idle'
    void ask(lastQuestion)
  }

  async function runReal(
    question: string,
    answer: AskTurn,
    onDelta: (t: string) => void,
    signal: AbortSignal,
    armWatchdog: () => void,
  ) {
    // Turnstile token'ı tek kullanımlıktır ve backend oturum başına bir kez
    // doğrular. Alınamazsa boş gider: engelli bir eklenti yüzünden paneli
    // kırmayız, güvenlik tarafı backend'de (bilet + IP penceresi) duruyor.
    const [captcha, tkt] = await Promise.all([turnstile.getToken(), getTicket()])

    const send = (t: string) =>
      fetch(apiUrl, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ticket: t,
          question,
          company: company.value,
          'cf-turnstile-response': captcha,
        }),
      })

    armWatchdog()
    let res = await send(tkt)
    // Bilet sunucuda süresi dolmuş sayılırsa bir kez tazeleyip tekrar dene:
    // sekmesi uzun süre açık kalan ziyaretçi elle yenilemek zorunda kalmasın.
    if (res.status === 401) {
      res = await send(await getTicket(true))
    }

    if (!res.ok || !res.headers.get('content-type')?.includes('text/event-stream')) {
      throw askError(
        res.status === 429 ? 'rate_limited' : res.status === 503 ? 'soon' : 'http',
      )
    }
    if (!res.body) throw new Error('ask: gövde yok')

    for await (const frame of readSse(res.body)) {
      if (frame.event === 'delta') {
        const d = frameJson<{ t: string }>(frame)
        if (d?.t) onDelta(d.t)
      } else if (frame.event === 'sources') {
        const s = frameJson<{ items: AskSource[] }>(frame)
        // Yalnız site içi yollar: modelin uydurduğu dış URL'yi gösterme.
        if (s?.items) answer.sources = s.items.filter((i) => i.url?.startsWith('/')).slice(0, 3)
      } else if (frame.event === 'done') {
        const d = frameJson<{ turnsLeft?: number }>(frame)
        if (typeof d?.turnsLeft === 'number') turnsLeft.value = d.turnsLeft
        return
      } else if (frame.event === 'error') {
        const e = frameJson<{ code?: string }>(frame)
        throw askError(e?.code || 'upstream')
      }
      // Bilinmeyen event tipleri sessizce yok sayılır.
    }
  }

  /** Backend hazır olmadan paneli gerçekçi göstermek için sahte akış. */
  async function runMock(question: string, onDelta: (t: string) => void, signal: AbortSignal) {
    const text = mockAnswer(question)
    await sleep(700, signal) // "düşünüyor" anı
    for (const word of text.split(/(?<=\s)/)) {
      if (signal.aborted) throw new DOMException('aborted', 'AbortError')
      onDelta(word)
      await sleep(28 + (word.length % 4) * 12, signal)
    }
  }

  onBeforeUnmount(reset)

  return {
    enabled,
    mockMode,
    state,
    mood,
    turns,
    draft,
    focused,
    company,
    announce,
    errorText,
    busy,
    canSend,
    turnsLeft,
    remainingChips,
    turnstile,
    verifying,
    warmUp,
    ask,
    stop,
    retry,
  }
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

/** Sahte cevaplar — yalnız mock modda. Marka sesinde, kısa, yargısız. */
function mockAnswer(question: string): string {
  const q = question.toLocaleLowerCase('tr')
  if (q.includes('kalori')) {
    return 'afiet kalori saydırmaz. Tabağını dilim, kase ve avuç gibi sofranın kendi ölçüleriyle anlatırsın; afiet de beş besin grubunu renklerle gösterir. Gün dengelendikçe sofran tamamlanır, bir limit ya da uyarı çıkmaz.'
  }
  if (q.includes('aile') || q.includes('ailece')) {
    return 'Herkesin kendi profili olur ama sofranız ortaktır. Kendi kaydını tutarsın, birlikte kurduğunuz alışkanlığı birlikte kutlarsınız. Kimse kimsenin tabağını denetlemez.'
  }
  if (q.includes('beta')) {
    return 'Beta için afiet.co/beta sayfasındaki kısa formu doldurman yeterli. İlk halkaya 100 kişi alıyoruz, sıra sana gelince e-posta ile yazıyoruz.'
  }
  return 'Bunu şu an bilmiyorum, uydurmak da istemem. afiet.co’da yazanlarla sınırlıyım. İstersen afiet’le ilgili başka bir şey sorabilirsin.'
}

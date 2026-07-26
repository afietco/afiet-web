/**
 * "Afi'ye sor" için bağımlılıksız SSE okuyucu.
 *
 * Neden EventSource değil: EventSource yalnız GET'tir, gövde taşıyamaz (soru,
 * bilet, captcha token'ı gövdede gider), başlık koyamaz ve bağlantı düşünce
 * kendiliğinden yeniden bağlanır — bu da aynı soruyu sessizce tekrar sorup
 * tekrar faturalandırır. Bu yüzden fetch + ReadableStream.
 *
 * TELİ ÇEKME NOKTASI: decode her zaman { stream: true } ile yapılır. Türkçe
 * karakterler (ğ ş ı ç ö ü) UTF-8'de 2 bayttır ve chunk sınırına denk
 * gelebilir; bayrak olmadan cevabın ortasında bozuk karakter çıkar.
 *
 * Sunucu sözleşmesi (backend kendi frame'lerini üretir, Foundry'nin ham
 * frame'leri ASLA buraya kadar gelmez — onlar sistem talimatını taşıyor):
 *   event: status   data: {"state":"searching"}
 *   event: delta    data: {"t":"afiet kalori "}
 *   event: sources  data: {"items":[{"title":"...","url":"/blog/..."}]}
 *   event: done     data: {"turnsLeft":4,"answered":true}
 *   event: error    data: {"code":"rate_limited","message":"..."}
 *   : ping
 */

export type SseFrame = { event: string; data: string }

/** Bir SSE gövdesini frame frame okur. Bozuk frame atlanır, akış kesilmez. */
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseFrame> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')

      let split: number
      while ((split = buffer.indexOf('\n\n')) !== -1) {
        const raw = buffer.slice(0, split)
        buffer = buffer.slice(split + 2)
        const frame = parseFrame(raw)
        if (frame) yield frame
      }
    }
    // Kuyrukta kalan baytları boşalt; son frame ayırıcısız gelmiş olabilir.
    buffer += decoder.decode()
    const tail = parseFrame(buffer.replace(/\r\n/g, '\n'))
    if (tail) yield tail
  } finally {
    reader.releaseLock()
  }
}

/** Tek bir frame metnini ayrıştırır. Yalnız yorum/boş ise null döner. */
function parseFrame(raw: string): SseFrame | null {
  let event = 'message'
  const data: string[] = []

  for (const line of raw.split('\n')) {
    if (!line || line.startsWith(':')) continue // yorum satırı = keepalive
    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    // "data: x" ve "data:x" ikisi de geçerli; yalnız ilk boşluk atılır.
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
  }

  if (!data.length) return null
  return { event, data: data.join('\n') }
}

/** Frame gövdesini güvenle JSON'a çevirir; bozuksa null (frame atlanır). */
export function frameJson<T>(frame: SseFrame): T | null {
  try {
    return JSON.parse(frame.data) as T
  } catch {
    return null
  }
}

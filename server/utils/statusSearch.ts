import type { H3Event } from 'h3'

/**
 * Kesinti anında canlı web araması (kullanıcı kararı, 16 Ağu 2026).
 *
 * NE İÇİN: kural tablosu (`statusDiagnose.ts`) bizim yığınımızı bilir ama
 * "şu anda başkaları da mı yaşıyor" sorusunu cevaplayamaz. Arama tam bunun
 * için dar tutuldu: son 24 saat, en fazla üç sonuç, olay başına BİR kez
 * (hatırlatmalarda tekrar aranmaz).
 *
 * NEDEN AYRI BİR SERVİS: Google'ın Custom Search JSON API'si 2025'te yeni
 * kayıtlara kapandı, Bing arama API'si emekliye ayrıldı. Geriye anahtarla
 * çalışan sağlayıcılar kaldı; ikisi de destekleniyor ve anahtarın ÖNEKİNDEN
 * tanınır, yani ikinci bir ayar değişkeni yok:
 *   - Tavily  (`tvly-…`): cevap cümlesi de döndürür
 *   - Brave   (`BSA…`) : ham web sonuçları
 *
 * ANAHTAR YOKSA SESSİZCE ATLANIR. Uyarı mailinin gitmesi aramaya asla
 * bağlanmaz: kesinti haberi, arama sonucundan önce gelir.
 */

const TIMEOUT_MS = 6000

export interface SearchHit {
  title: string
  url: string
  snippet: string
}

export interface SearchResult {
  provider: 'tavily' | 'brave'
  /** Sağlayıcı bir özet cümlesi veriyorsa. Doğrulanmamıştır, mailde öyle etiketlenir. */
  answer?: string
  hits: SearchHit[]
}

function timeout(): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), TIMEOUT_MS)
  return controller.signal
}

// Düz `fetch`: dış uçlarda `$fetch`in rota tipi çıkarımı derleyiciyi
// kilitliyor (TS2321). Aynı gerekçe `statusLogs.ts`te de yazılı.
async function tavily(key: string, query: string): Promise<SearchResult | null> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      max_results: 3,
      topic: 'general',
      time_range: 'day',
      include_answer: 'basic',
    }),
    signal: timeout(),
  })
  if (!res.ok) throw new Error(`Tavily ${res.status}`)
  const body = (await res.json()) as {
    answer?: string
    results?: { title?: string; url?: string; content?: string }[]
  }
  const hits = (body.results ?? []).slice(0, 3).map((r) => ({
    title: (r.title ?? '').slice(0, 140),
    url: r.url ?? '',
    snippet: (r.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 220),
  }))
  if (!body.answer && hits.length === 0) return null
  return { provider: 'tavily', answer: body.answer?.slice(0, 400), hits }
}

async function brave(key: string, query: string): Promise<SearchResult | null> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', '3')
  url.searchParams.set('freshness', 'pd')
  const res = await fetch(url, {
    headers: { 'X-Subscription-Token': key, Accept: 'application/json' },
    signal: timeout(),
  })
  if (!res.ok) throw new Error(`Brave ${res.status}`)
  const body = (await res.json()) as {
    web?: { results?: { title?: string; url?: string; description?: string }[] }
  }
  const hits = (body.web?.results ?? []).slice(0, 3).map((r) => ({
    title: (r.title ?? '').replace(/<[^>]+>/g, '').slice(0, 140),
    url: r.url ?? '',
    snippet: (r.description ?? '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220),
  }))
  if (hits.length === 0) return null
  return { provider: 'brave', hits }
}

/**
 * Sorguyu arar. Anahtar yoksa, sorgu boşsa ya da sağlayıcı düşerse `null`:
 * arama bir ek, bir bağımlılık değil.
 */
export async function searchCause(event: H3Event, query: string): Promise<SearchResult | null> {
  const key = String(useRuntimeConfig(event).searchApiKey ?? '').trim()
  if (!key || !query.trim()) return null
  try {
    return key.startsWith('tvly-') ? await tavily(key, query) : await brave(key, query)
  } catch (err) {
    // Arama başarısızlığı uyarıyı düşürmez, yalnız log'a not düşer.
    console.error('[durum] arama başarısız:', err instanceof Error ? err.message : err)
    return null
  }
}

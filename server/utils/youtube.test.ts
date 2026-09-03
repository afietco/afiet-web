import { afterEach, beforeEach, describe as suite, expect, it, vi } from 'vitest'
import { accessTokenFrom, durationSeconds, fetchVideoDetails, syncYouTube } from './youtube'

/**
 * YouTube senkronunun sözleşmesi, gerçek Google'a dokunmadan sabitlenir:
 * hangi rapor sorulur, satırlar hangi tabloya nasıl düşer, bir sorgu
 * düştüğünde turun geri kalanı ayakta kalır mı.
 *
 * Nuxt otomatik içe aktarmaları (useRuntimeConfig, createError) burada elle
 * stub'lanır: vitest Nuxt yapılandırmasını okumaz, ama bu iki isim yalnız
 * fonksiyon GÖVDESİNDE çağrıldığı için import anında sorun çıkmıyor.
 */

const jsonRes = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: async () => body, text: async () => JSON.stringify(body) }) as Response

/** 32 baytlık sabit anahtar; token şifreleme yolu testte de gerçek koşar. */
const KEY = btoa(String.fromCharCode(...new Uint8Array(32).map((_, i) => (i * 7 + 3) % 256)))

type SqlCall = { text: string; values: unknown[] }

function fakeSql(rowsFor: (text: string) => unknown[] = () => []) {
  const calls: SqlCall[] = []
  const fn = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join(' ? ').replace(/\s+/g, ' ').trim()
    calls.push({ text, values })
    return Promise.resolve(rowsFor(text))
  }) as unknown as { calls: SqlCall[] } & ((s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown[]>)
  ;(fn as unknown as { calls: SqlCall[] }).calls = calls
  return fn
}

const analyticsRows = (url: string) => {
  const u = new URL(url)
  const dimensions = u.searchParams.get('dimensions') ?? ''
  if (dimensions === 'day') {
    return {
      columnHeaders: [
        { name: 'day' },
        { name: 'views' },
        { name: 'estimatedMinutesWatched' },
        { name: 'averageViewPercentage' },
        { name: 'subscribersGained' },
        { name: 'subscribersLost' },
      ],
      rows: [
        ['2026-08-28', 120, 430, 38.5, 9, 1],
        ['2026-08-29', 80, 260, 41.2, 4, 0],
      ],
    }
  }
  if (dimensions === 'day,insightTrafficSourceType') {
    return {
      columnHeaders: [{ name: 'day' }, { name: 'insightTrafficSourceType' }, { name: 'views' }, { name: 'estimatedMinutesWatched' }],
      rows: [
        ['2026-08-28', 'YT_SEARCH', 70, 300],
        ['2026-08-28', 'SHORTS', 50, 130],
      ],
    }
  }
  if (dimensions === 'day,country') {
    return {
      columnHeaders: [{ name: 'day' }, { name: 'country' }, { name: 'views' }, { name: 'estimatedMinutesWatched' }],
      rows: [['2026-08-28', 'TR', 110, 400]],
    }
  }
  if (dimensions === 'day,deviceType') {
    return {
      columnHeaders: [{ name: 'day' }, { name: 'deviceType' }, { name: 'views' }, { name: 'estimatedMinutesWatched' }],
      rows: [['2026-08-28', 'MOBILE', 100, 380]],
    }
  }
  if (dimensions === 'video') {
    return {
      columnHeaders: [
        { name: 'video' },
        { name: 'views' },
        { name: 'estimatedMinutesWatched' },
        { name: 'averageViewDuration' },
        { name: 'averageViewPercentage' },
        { name: 'subscribersGained' },
        { name: 'likes' },
        { name: 'comments' },
        { name: 'shares' },
      ],
      rows: [
        ['vid-eslesen', 900, 3200, 213, 42.5, 30, 44, 8, 3],
        ['vid-serbest', 400, 900, 135, 31.0, 6, 12, 1, 0],
      ],
    }
  }
  if (dimensions === 'ageGroup,gender') {
    return {
      columnHeaders: [{ name: 'ageGroup' }, { name: 'gender' }, { name: 'viewerPercentage' }],
      rows: [
        ['age25-34', 'FEMALE', 34.2],
        ['age35-44', 'MALE', 12.8],
      ],
    }
  }
  return { columnHeaders: [], rows: [] }
}

function googleFetch(overrides: { failDimensions?: string } = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('oauth2.googleapis.com/token')) return jsonRes({ access_token: 'ACCESS-1' })
    if (url.includes('/youtube/v3/channels')) {
      return jsonRes({
        items: [
          {
            id: 'UC-kanal',
            snippet: { title: 'afiet', customUrl: '@afietco', publishedAt: '2026-08-26T10:00:00Z' },
            statistics: { subscriberCount: '268', videoCount: '6' },
          },
        ],
      })
    }
    if (url.includes('/youtube/v3/videos')) {
      return jsonRes({
        items: [
          { id: 'vid-eslesen', snippet: { title: 'Kalori saymayı bıraktım', publishedAt: '2026-08-27T17:00:00Z' }, contentDetails: { duration: 'PT8M12S' } },
          { id: 'vid-serbest', snippet: { title: 'Bir avuç ne kadar', publishedAt: '2026-08-28T17:00:00Z' }, contentDetails: { duration: 'PT48S' } },
        ],
      })
    }
    if (url.includes('youtubeanalytics.googleapis.com')) {
      const dimensions = new URL(url).searchParams.get('dimensions') ?? ''
      if (overrides.failDimensions && dimensions === overrides.failDimensions) {
        return jsonRes({ error: { status: 'INVALID_ARGUMENT', message: 'boyut desteklenmiyor' } }, false, 400)
      }
      return jsonRes(analyticsRows(url))
    }
    throw new Error(`beklenmeyen istek: ${url}`)
  })
}

/** Yalnız `vid-eslesen` takvimde karşılığı olan video; diğeri bağsız kalır. */
const sqlRows = (text: string): unknown[] => {
  if (text.startsWith('SELECT 1 FROM content_items')) return [{ ok: 1 }]
  if (text.includes('WHERE platform_post_id =')) return []
  if (text.includes('position(')) return []
  return []
}

let account: { id: number; platform: 'youtube'; handle: string; encryptedToken: string } & Record<string, unknown>

beforeEach(async () => {
  vi.stubGlobal('useRuntimeConfig', () => ({
    ytClientId: 'client',
    ytClientSecret: 'secret',
    ytRedirectUri: 'https://afiet.co/api/social/youtube/callback',
    socialTokenKey: KEY,
  }))
  vi.stubGlobal('createError', (o: { statusMessage?: string }) => Object.assign(new Error(o.statusMessage ?? 'hata'), o))
  const { encryptToken } = await import('./socialCrypto')
  account = {
    id: 1,
    platform: 'youtube',
    handle: '@afietco',
    externalId: 'UC-kanal',
    status: 'bagli',
    expiresAt: null,
    lastSyncAt: null,
    lastResult: '',
    createdAt: '',
    encryptedToken: await encryptToken({} as never, 'REFRESH-GIZLI'),
  }
})

afterEach(() => vi.unstubAllGlobals())

suite('durationSeconds', () => {
  it('ISO 8601 süreyi saniyeye çevirir', () => {
    expect(durationSeconds('PT8M12S')).toBe(492)
    expect(durationSeconds('PT48S')).toBe(48)
    expect(durationSeconds('PT1H2M3S')).toBe(3723)
    expect(durationSeconds('bozuk')).toBe(0)
  })
})

suite('fetchVideoDetails', () => {
  it('3 dakikadan kısa videoyu shorts sayar, uzununu video', async () => {
    const details = await fetchVideoDetails('T', ['vid-eslesen', 'vid-serbest'], { fetch: googleFetch() })
    expect(details.find((d) => d.id === 'vid-eslesen')?.format).toBe('video')
    expect(details.find((d) => d.id === 'vid-serbest')?.format).toBe('shorts')
  })
})

suite('accessTokenFrom', () => {
  it('invalid_grant için okunur mesaj verir ve token sızdırmaz', async () => {
    const fetch = vi.fn(async () => jsonRes({ error: 'invalid_grant', error_description: 'Token expired' }, false, 400))
    const config = { clientId: 'c', clientSecret: 's', redirectUri: 'r' }
    await expect(accessTokenFrom(config, 'REFRESH-GIZLI', { fetch })).rejects.toThrow(/yeniden bağla/)
    await expect(accessTokenFrom(config, 'REFRESH-GIZLI', { fetch })).rejects.not.toThrow(/REFRESH-GIZLI/)
  })
})

suite('syncYouTube', () => {
  it('günlük seriyi, kırılımları ve pencere anlık görüntülerini yazar', async () => {
    const sql = fakeSql(sqlRows)
    const fetch = googleFetch()
    const summary = await syncYouTube({} as never, sql as never, account as never, { fetch }, 7)

    const texts = sql.calls.map((c) => c.text)
    const daily = sql.calls.filter((c) => c.text.includes('INSERT INTO youtube_daily') && c.text.includes('views'))
    expect(daily.length).toBeGreaterThanOrEqual(2)
    expect(daily[0]?.values).toContain('2026-08-28')

    // Abone TOPLAMI ayrı satırdan gelir (Analytics onu vermiyor).
    expect(texts.some((t) => t.includes('INSERT INTO youtube_daily') && t.includes('subscribers_total'))).toBe(true)

    // Üç kırılım da tarih başına yazılır.
    const dims = sql.calls.filter((c) => c.text.includes('INSERT INTO youtube_rows')).map((c) => c.values[1])
    expect(new Set(dims)).toEqual(new Set(['traffic', 'country', 'device']))

    // Dört pencere de tazelenir (silinip yeniden yazılır).
    const deleted = sql.calls.filter((c) => c.text.includes('DELETE FROM youtube_videos')).map((c) => c.values[0])
    expect(deleted).toEqual(['7d', '30d', '90d', 'omur'])
    const demographics = sql.calls.filter((c) => c.text.includes('DELETE FROM youtube_demographics')).map((c) => c.values[0])
    expect(demographics).toEqual(['7d', '30d', '90d'])

    // Demografi anahtarı cinsiyet:yaş biçiminde ve küçük harf.
    const demoInsert = sql.calls.find((c) => c.text.includes('INSERT INTO youtube_demographics'))
    expect(demoInsert?.values[1]).toBe('female:age25-34')

    expect(summary.fetched).toBe(2)
    expect(summary.errors).toEqual([])
  })

  it('takvime bağlı olmayan video için content_metrics YAZMAZ', async () => {
    const sql = fakeSql(sqlRows)
    const summary = await syncYouTube({} as never, sql as never, account as never, { fetch: googleFetch() }, 7)
    expect(sql.calls.some((c) => c.text.includes('INSERT INTO content_metrics'))).toBe(false)
    expect(summary.matched).toBe(0)
    expect(summary.measured).toBe(0)
  })

  it('eşleşen videonun ÖMÜR toplamını content_metrics e yazar', async () => {
    const sql = fakeSql((text) => {
      if (text.startsWith('SELECT 1 FROM content_items')) return [{ ok: 1 }]
      if (text.includes('WHERE platform_post_id = ?')) return [{ id: 42 }]
      return []
    })
    const summary = await syncYouTube({} as never, sql as never, account as never, { fetch: googleFetch() }, 7)
    const metric = sql.calls.find((c) => c.text.includes('INSERT INTO content_metrics'))
    expect(metric).toBeTruthy()
    // Ömür penceresi de 900 görüntülenme döndürüyor; yazılan sayı odur.
    expect(metric?.values).toContain(900)
    expect(metric?.values).toContain('youtube')
    expect(summary.measured).toBe(2)
  })

  it('bir kırılım düşse de günlük seri yazılmaya devam eder', async () => {
    const sql = fakeSql(sqlRows)
    const summary = await syncYouTube(
      {} as never,
      sql as never,
      account as never,
      { fetch: googleFetch({ failDimensions: 'day,deviceType' }) },
      7,
    )
    expect(sql.calls.some((c) => c.text.includes('INSERT INTO youtube_daily') && c.text.includes('views'))).toBe(true)
    expect(summary.errors.some((e) => e.startsWith('device:'))).toBe(true)
    // Hata özeti panele tek satır olarak gider ve token taşımaz.
    expect(summary.errors.join(' ')).not.toContain('REFRESH-GIZLI')
  })
})

import { describe, expect, it } from 'vitest'
import {
  aggregateDiscover,
  dimensionCheckSql,
  upsertDiscoverRows,
  type DiscoverRowInput,
} from './gscDiscoverStore'

/**
 * Sahte `sql`: neon'un etiketli şablonunu, `.query()`sini ve `.unsafe()`ini
 * taklit eder. Sorguları kaydeder ve metne göre canned satır döndürür, böylece
 * mantık gerçek bir veritabanı olmadan sınanır.
 */
type Sql = Parameters<typeof upsertDiscoverRows>[0]

function fakeSql(answer: (text: string) => unknown[] = () => []) {
  const calls: { text: string; params: unknown[] }[] = []
  const run = (text: string, params: unknown[]) => {
    calls.push({ text, params })
    return Promise.resolve(answer(text))
  }
  const tag = (strings: TemplateStringsArray, ...params: unknown[]) => run(strings.join(' ? '), params)
  const fake = Object.assign(tag, {
    query: (text: string, params: unknown[] = []) => run(text, params),
    unsafe: (raw: string) => raw,
  })
  return { sql: fake as unknown as Sql, calls }
}

describe('dimensionCheckSql (boyut beyaz listesi tek kaynaktan)', () => {
  it('kısıt listesini sabitten üretir', () => {
    expect(dimensionCheckSql()).toBe("'page','country'")
  })
  it("Discover'da olmayan 'query' bilerek listede değildir", () => {
    expect(dimensionCheckSql()).not.toContain('query')
  })
  it('sabit-kimlik olmayan değeri reddeder (unsafe gerçekten güvenli kalsın)', () => {
    expect(() => dimensionCheckSql(["page'); DROP TABLE gsc_discover_rows; --"])).toThrow()
    expect(() => dimensionCheckSql(['Page'])).toThrow()
    expect(() => dimensionCheckSql([''])).toThrow()
  })
})

describe('upsertDiscoverRows', () => {
  const row = (key: string, impressions: number): DiscoverRowInput => ({
    date: '2026-08-20',
    dimension: 'page',
    key,
    clicks: 0,
    impressions,
  })

  it('parti içinde tekrar eden anahtarı teke indirir, son değer kazanır', async () => {
    const { sql, calls } = fakeSql()
    await upsertDiscoverRows(sql, [row('/a', 1), row('/b', 2), row('/a', 9)])
    expect(calls).toHaveLength(1)
    // 2 benzersiz satır x 5 parametre
    expect(calls[0]?.params).toHaveLength(10)
    expect(calls[0]?.params).toContain(9)
    expect(calls[0]?.params).not.toContain(1)
  })

  it('parti boyunu aşınca böler (Vercel 60 sn tavanı için tek turda yazmaz)', async () => {
    const { sql, calls } = fakeSql()
    const rows = Array.from({ length: 5 }, (_, i) => row(`/s${i}`, i))
    await upsertDiscoverRows(sql, rows, 2)
    expect(calls).toHaveLength(3)
  })

  it('boş girdide hiç sorgu açmaz', async () => {
    const { sql, calls } = fakeSql()
    await upsertDiscoverRows(sql, [])
    expect(calls).toHaveLength(0)
  })
})

describe('aggregateDiscover: "ölçüm yok" ile "sıfır" ayrımı', () => {
  it('ölçüm yokken measured:false ve seri BOŞ döner (sıfır çizgisi çizdirilemez)', async () => {
    const { sql } = fakeSql((text) => {
      if (text.includes('last_run_at')) return [{ last_run_at: '2026-08-26T06:30:00Z' }]
      if (text.includes('EXISTS')) return [{ ever: false }]
      return []
    })
    const data = await aggregateDiscover(sql, '30d', true)
    expect(data.measured).toBe(false)
    expect(data.series).toEqual([])
    expect(data.totals).toEqual({ clicks: 0, impressions: 0, ctrPct: 0 })
    // Senkron koştu: "cron hiç koşmadı" ile karıştırılmasın diye ayrı alan.
    expect(data.lastSyncAt).not.toBeNull()
  })

  /**
   * Bu işin en kolay yanlış yapılacak yeri. API, eşik altındaki mülke BOŞ
   * yanıt değil sıfır dolu satırlar döndürüyor (26 Ağu 2026'da canlı mülkte
   * ölçüldü: 43 satır, toplam gösterim 0). `measured` satır varlığına
   * bakarsa panel ilk senkrondan sonra ölçümsüz bir sıfır çizgisi çizer.
   */
  it('sıfır dolu satırlar ölçüm SAYILMAZ: sorgu impressions>0 arar', async () => {
    const sorgular: string[] = []
    const { sql } = fakeSql((text) => {
      sorgular.push(text)
      if (text.includes('last_run_at')) return [{ last_run_at: '2026-08-26T06:30:00Z' }]
      // Satırlar var ama hepsi sıfır: EXISTS koşulu bu yüzden false döner.
      if (text.includes('EXISTS')) return [{ ever: false }]
      return []
    })
    const data = await aggregateDiscover(sql, '30d', true)
    const exists = sorgular.find((t) => t.includes('EXISTS')) ?? ''
    expect(exists).toContain('impressions > 0')
    expect(exists).toContain('clicks > 0')
    expect(data.measured).toBe(false)
    expect(data.series).toEqual([])
  })

  it('senkron hiç koşmadıysa lastSyncAt null kalır', async () => {
    const { sql } = fakeSql((text) => {
      if (text.includes('last_run_at')) return []
      if (text.includes('EXISTS')) return [{ ever: false }]
      return []
    })
    const data = await aggregateDiscover(sql, '7d', true)
    expect(data.lastSyncAt).toBeNull()
    expect(data.measured).toBe(false)
  })

  it('veri geldiğinde seri dolar ve CTR gösterimden türetilir', async () => {
    const { sql } = fakeSql((text) => {
      if (text.includes('last_run_at')) return [{ last_run_at: '2026-08-26T06:30:00Z' }]
      if (text.includes('EXISTS')) return [{ ever: true }]
      if (text.includes('generate_series')) {
        return [
          { date: '2026-08-25', clicks: 1, impressions: 40 },
          { date: '2026-08-26', clicks: 3, impressions: 60 },
        ]
      }
      if (text.includes('SUM(clicks)') && text.includes('gsc_discover_daily')) {
        return [{ clicks: 4, impressions: 100 }]
      }
      if (text.includes('gsc_discover_rows')) return [{ key: '/blog/tahillar-grubu', clicks: 4, impressions: 100 }]
      return []
    })
    const data = await aggregateDiscover(sql, '7d', true)
    expect(data.measured).toBe(true)
    expect(data.series).toHaveLength(2)
    expect(data.totals).toEqual({ clicks: 4, impressions: 100, ctrPct: 4 })
    expect(data.pages[0]?.key).toBe('/blog/tahillar-grubu')
    expect(data.pages[0]?.ctr).toBe(4)
  })

  it('Discover ortalama pozisyon TAŞIMAZ (arama toplamlarına karışmasın)', async () => {
    const { sql } = fakeSql((text) => {
      if (text.includes('last_run_at')) return [{ last_run_at: '2026-08-26T06:30:00Z' }]
      if (text.includes('EXISTS')) return [{ ever: true }]
      return [{ clicks: 0, impressions: 0 }]
    })
    const data = await aggregateDiscover(sql, '7d', true)
    expect(data.totals).not.toHaveProperty('position')
  })
})

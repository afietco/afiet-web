import { requireAdmin } from '~~/server/utils/adminAuth'
import { requireContentDb } from '~~/server/utils/contentStore'
import { parseRange } from '~~/server/utils/analyticsReport'

/**
 * Panel (Analitik → Instagram) verisi: `content_metrics` + `content_items`ten
 * TOPLU Instagram metrikleri. `?range=7d|30d|90d`.
 *
 * Ölçümler ANLIK GÖRÜNTÜdür (gönderinin o günkü ömür toplamı; IG insights
 * böyle döner, elle giriş de böyle yapılır). Günlük seri bu yüzden ardışık
 * görüntüler arasındaki ARTIŞTAN türetilir; bir gönderinin İLK görüntüsü o
 * güne yazılır (öncesi bilinemez - seyrek elle girişte tek güne yığılma
 * bilinçli bir ödünleşim). Gönderi tablosu ise son görüntünün kendisidir.
 */

type MetricRow = {
  item_id: number
  metric_date: string
  views: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  interactions: number
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const sql = await requireContentDb(event)
  const range = parseRange(getQuery(event).range)
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30

  const items = (await sql`
    SELECT id, title, format, status, planned_at, published_url
    FROM content_items WHERE channel = 'instagram'
  `) as { id: number; title: string; format: string; status: string; planned_at: string | null }[]
  const itemIds = items.map((i) => Number(i.id))

  const metrics = itemIds.length
    ? ((await sql`
        SELECT item_id, metric_date::text AS metric_date, views, reach, likes, comments, shares, saves, interactions
        FROM content_metrics
        WHERE item_id = ANY(${itemIds})
        ORDER BY item_id, metric_date
      `) as MetricRow[])
    : []

  // Gün listesi (bugün dahil geriye `days` gün) - veri olmayan gün 0 çizilir.
  const dayKeys: string[] = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    dayKeys.push(d.toISOString().slice(0, 10))
  }
  const byDate = new Map(dayKeys.map((k) => [k, { views: 0, reach: 0, engagement: 0 }]))

  const engagementOf = (m: MetricRow) =>
    Number(m.interactions) > 0
      ? Number(m.interactions)
      : Number(m.likes) + Number(m.comments) + Number(m.saves) + Number(m.shares)

  const latestByItem = new Map<number, MetricRow>()
  let prev: MetricRow | null = null
  for (const m of metrics) {
    const sameItem = prev && Number(prev.item_id) === Number(m.item_id)
    const dViews = Math.max(0, Number(m.views) - (sameItem ? Number(prev!.views) : 0))
    const dReach = Math.max(0, Number(m.reach) - (sameItem ? Number(prev!.reach) : 0))
    const dEng = Math.max(0, engagementOf(m) - (sameItem ? engagementOf(prev!) : 0))
    const bucket = byDate.get(String(m.metric_date).slice(0, 10))
    if (bucket) {
      bucket.views += dViews
      bucket.reach += dReach
      bucket.engagement += dEng
    }
    latestByItem.set(Number(m.item_id), m)
    prev = m
  }

  const series = dayKeys.map((date) => {
    const b = byDate.get(date)!
    return { date, views: b.views, reach: b.reach }
  })

  const rangeStart = dayKeys[0] ?? ''
  const posts = items
    .map((item) => {
      const m = latestByItem.get(Number(item.id))
      if (!m) return null
      return {
        itemId: Number(item.id),
        title: item.title,
        format: item.format,
        publishedAt: item.planned_at ? String(item.planned_at).slice(0, 10) : null,
        measuredAt: String(m.metric_date).slice(0, 10),
        views: Number(m.views),
        reach: Number(m.reach),
        likes: Number(m.likes),
        comments: Number(m.comments),
        saved: Number(m.saves),
        shares: Number(m.shares),
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => b.views - a.views)
    .slice(0, 50)

  const publishedInRange = items.filter(
    (i) => i.status === 'yayinda' && i.planned_at && String(i.planned_at).slice(0, 10) >= rangeStart,
  ).length

  const sum = (fn: (b: { views: number; reach: number; engagement: number }) => number) =>
    [...byDate.values()].reduce((s, b) => s + fn(b), 0)

  return {
    generatedAt: new Date().toISOString(),
    live: true,
    range,
    totals: {
      views: sum((b) => b.views),
      reach: sum((b) => b.reach),
      interactions: sum((b) => b.engagement),
      posts: publishedInRange,
    },
    series,
    posts,
  }
})

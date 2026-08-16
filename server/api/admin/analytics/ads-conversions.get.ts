import { requireAdmin } from '~~/server/utils/adminAuth'
import { analyticsSql, ensureAnalyticsTables } from '~~/server/utils/analyticsStore'
import { parseRange } from '~~/server/utils/analyticsReport'

/**
 * Google Ads "offline conversion" CSV'si (panel → Analitik → Kaynaklar →
 * "Google Ads CSV"). Web dönüşümlerini (`magaza_tik`, `bulten_kayit`) aynı
 * ziyaretçinin son 90 gün içindeki reklam tıklama kimliğiyle (gclid / gbraid /
 * wbraid) eşler ve Google'ın yükleme şablonu biçiminde döner; Google Ads'te
 * "Dönüşümler → Yüklemeler" ekranından ya da Data Manager'dan elle yüklenir.
 *
 * Bu, sitede Google etiketi çalıştırmadan (karar G1) Search kampanyalarına
 * dönüşüm sinyali vermenin tek yolu. Kapsamı analitik onayı verenlerle sınırlı;
 * eşleşen payı panel "tıklama kimlikli" sayısıyla gösterir.
 *
 * Şablon: ilk satır `Parameters:TimeZone=Europe/Istanbul`, sonra başlıklar.
 * Dönüşüm adları Google Ads'teki dönüşüm işlemleriyle BİREBİR aynı olmalı:
 *   web_magaza_tik    (mağaza bağlantısı tıklaması)
 *   web_bulten_kayit  (bülten kaydı)
 * Değer ve para birimi boş bırakılır (değer bazlı teklif web'de kullanılmıyor).
 * Kişisel veri yok: e-posta, IP, ad; yalnız tıklama kimliği + ad + zaman.
 */

const CONVERSION_NAME: Record<string, string> = {
  magaza_tik: 'web_magaza_tik',
  bulten_kayit: 'web_bulten_kayit',
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const sql = analyticsSql(event)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })
  await ensureAnalyticsTables(sql)

  const domains = String(useRuntimeConfig(event).public.analyticsDomains || 'afiet.co,www.afiet.co')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
  const range = parseRange(getQuery(event).range)
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30

  // Her dönüşüm için ziyaretçinin dönüşümden ÖNCEKİ, 90 gün içindeki SON
  // tıklama kimliği (Google'ın penceresi 90 gün; tıklamadan önce olan dönüşüm
  // reddedilir, bu yüzden c.ts <= e.ts şart).
  const rows = (await sql`
    SELECT e.event,
           to_char(e.ts AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI:SS') AS t,
           c.click_kind, c.click_id
    FROM analytics_events e
    JOIN LATERAL (
      SELECT click_kind, click_id
      FROM analytics_events c
      WHERE c.visitor_id = e.visitor_id AND c.click_id IS NOT NULL
        AND c.ts <= e.ts AND c.ts >= e.ts - interval '90 days'
      ORDER BY c.ts DESC LIMIT 1
    ) c ON true
    WHERE e.event IN ('magaza_tik','bulten_kayit')
      AND e.host = ANY(${domains}) AND e.ts >= now() - make_interval(days => ${days})
    ORDER BY e.ts
  `) as { event: string; t: string; click_kind: string; click_id: string }[]

  const lines = [
    'Parameters:TimeZone=Europe/Istanbul,,,,,,',
    'Google Click ID,GBRAID,WBRAID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency',
  ]
  for (const r of rows) {
    const gclid = r.click_kind === 'gclid' ? r.click_id : ''
    const gbraid = r.click_kind === 'gbraid' ? r.click_id : ''
    const wbraid = r.click_kind === 'wbraid' ? r.click_id : ''
    const name = CONVERSION_NAME[r.event] ?? r.event
    lines.push([gclid, gbraid, wbraid, name, r.t, '', ''].map(csvCell).join(','))
  }

  const today = new Date().toISOString().slice(0, 10)
  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="afiet-google-ads-donusumler-${range}-${today}.csv"`)
  setHeader(event, 'cache-control', 'no-store')
  return lines.join('\n') + '\n'
})

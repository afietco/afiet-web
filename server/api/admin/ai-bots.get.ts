import { requireAdmin } from '~~/server/utils/adminAuth'
import { botBilgisi, botSql, ensureBotTables } from '~~/server/utils/botStore'
import { parseRange } from '~~/server/utils/analyticsReport'

/**
 * Panel verisi: `ai_bot_hits`ten AI tarayıcı özeti. `?range=7d|30d|90d`.
 * DB yoksa 503 `db_bagli_degil` (analitik ucuyla aynı sözleşme).
 *
 * `kapsam` alanı BİLEREK yanıtın içindedir: sayfa bazlı sayılar ISR cache'i
 * yüzünden ALT SINIRDIR ve bu uyarı veriyle birlikte taşınmazsa panelde
 * "demek ki az geliyor" diye yanlış okunur. Ayrıntı: botStore.ts başı.
 */
const GUN: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 }

/** ISR'siz oldukları için tam kapsanan yollar (tarayıcı nabzı). */
const NABIZ_YOLLARI = ['/robots.txt', '/sitemap.xml', '/llms.txt', '/llms-full.txt']

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const sql = botSql(event)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })
  await ensureBotTables(sql)

  const range = parseRange(getQuery(event).range)
  const since = new Date(Date.now() - GUN[range]! * 86400_000)

  const domains = String(useRuntimeConfig(event).public.analyticsDomains || 'afiet.co,www.afiet.co')
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)

  const [botlar, gunluk, yollar, sonHatalar] = await Promise.all([
    sql`
      SELECT bot,
             count(*)::int AS istek,
             min(ts) AS ilk,
             max(ts) AS son,
             count(*) FILTER (WHERE status BETWEEN 200 AND 299)::int AS ok,
             count(*) FILTER (WHERE status = 404)::int AS bulunamadi,
             count(*) FILTER (WHERE status = 429)::int AS kisitlandi,
             count(*) FILTER (WHERE status >= 500)::int AS sunucu_hatasi
        FROM ai_bot_hits
       WHERE ts >= ${since} AND host = ANY(${domains})
       GROUP BY bot
       ORDER BY istek DESC
    `,
    sql`
      SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS gun,
             bot,
             count(*)::int AS istek
        FROM ai_bot_hits
       WHERE ts >= ${since} AND host = ANY(${domains})
       GROUP BY 1, 2
       ORDER BY 1
    `,
    sql`
      SELECT path, count(*)::int AS istek, count(DISTINCT bot)::int AS bot_sayisi
        FROM ai_bot_hits
       WHERE ts >= ${since} AND host = ANY(${domains})
       GROUP BY path
       ORDER BY istek DESC
       LIMIT 25
    `,
    sql`
      SELECT ts, bot, path, status
        FROM ai_bot_hits
       WHERE ts >= ${since} AND host = ANY(${domains}) AND status >= 400
       ORDER BY ts DESC
       LIMIT 50
    `,
  ])

  const zenginBotlar = botlar.map((r) => {
    const bilgi = botBilgisi(String(r.bot))
    return {
      bot: r.bot,
      sahip: bilgi?.owner ?? null,
      amac: bilgi?.purpose ?? null,
      istek: r.istek,
      ilk: r.ilk,
      son: r.son,
      ok: r.ok,
      bulunamadi: r.bulunamadi,
      kisitlandi: r.kisitlandi,
      // Postgres tırnaksız alias'ı küçük harfe indirir; alias'lar bu yüzden
      // snake_case yazılır ve panele camelCase olarak burada çevrilir.
      sunucuHatasi: r.sunucu_hatasi,
    }
  })

  const nabiz = yollar.filter((r) => NABIZ_YOLLARI.includes(String(r.path)))

  return {
    generatedAt: new Date().toISOString(),
    range,
    toplam: zenginBotlar.reduce((n, b) => n + Number(b.istek), 0),
    botlar: zenginBotlar,
    gunluk,
    yollar,
    nabiz,
    sonHatalar,
    kapsam: {
      tamKapsananYollar: NABIZ_YOLLARI,
      not:
        'Sayfa bazlı sayılar ALT SINIRDIR: içerik sayfaları ISR ile CDN`de ' +
        'cache`lendiği için cache`ten dönen bot istekleri sunucuya ulaşmaz ve ' +
        'buraya düşmez. Yukarıdaki yollar ISR`siz olduğundan tam kapsanır. ' +
        'Platform seviyesinde verilen 429 da bu tabloda görünmez.',
    },
  }
})

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { H3Event } from 'h3'
import { AI_BOTS } from '~~/server/utils/seoDefaults'

/**
 * AI tarayıcı erişim kaydı (GEO ölçümünün "sunucu logu" katmanı).
 *
 * NEDEN VAR: Vercel'in runtime log'u Hobby planında YALNIZ 1 SAAT saklanıyor
 * (Pro 1 gün, Pro + Observability Plus 30 gün) ve user agent'a göre filtre
 * kabul etmiyor; arama yalnız `message` ve `requestPath` alanlarında çalışır,
 * UA sadece tek bir isteğin detay panelinde görünür. Yani "GPTBot bu hafta
 * geldi mi" sorusu Vercel'den CEVAPLANAMIYOR ve veri geriye dönük
 * üretilemiyor. Bu tablo o yüzden var: geçmiş bizde kalır, süresizdir.
 *
 * ⚠️ KAPSAM SINIRI (bilinçli): içerik sayfaları `isr: 60` ile CDN'de
 * cache'lenir ve Vercel'de ISR stale-while-revalidate'tir. Cache'te kaydı olan
 * bir yol (taze ya da bayat) doğrudan CDN'den servis edilir, fonksiyonumuz hiç
 * çalışmaz, dolayısıyla bu kayıt da düşmez. Bayat kayıtta tetiklenen tazeleme
 * AYRI bir iç istektir (UA'sı "node") ve botun kendi isteği değildir.
 * Pratikte tam kapsanan yollar `routeRules`ta ISR'siz olanlardır:
 * /robots.txt, /sitemap.xml, /llms.txt, /llms-full.txt. Tarayıcılar taramadan
 * önce robots.txt'yi hep çektiği için bu "hangi bot aktif" nabzı GÜVENİLİRDİR;
 * sayfa bazlı sayılar ise ALT SINIRDIR, gerçek tarama bundan fazladır.
 * Tam kapsam Log Drains (Pro ve üstü) ya da Vercel log API'sinden aktarım ister.
 *
 * ⚠️ 429 SINIRI: platform seviyesinde (Vercel DDoS/firewall) verilen 429 bizim
 * fonksiyonumuza hiç ulaşmaz, o yüzden buraya da düşmez. Buradaki durum kodu
 * UYGULAMANIN verdiği yanıttır.
 *
 * IP SAKLANMAZ ([[web-analitik-first-party]] doktriniyle aynı). Bunun bedeli:
 * UA taklit eden sahte botlar ayırt edilemez (doğrulama rDNS ya da resmî IP
 * aralığı ister). Sayılar bu yüzden "iddia edilen bot" sayısıdır.
 */

type Sql = NeonQueryFunction<false, false>
let ensured = false

export function botSql(event: H3Event): Sql | null {
  const url = useRuntimeConfig(event).databaseUrl
  return url ? neon(url) : null
}

export async function ensureBotTables(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS ai_bot_hits (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ts timestamptz NOT NULL DEFAULT now(),
      bot text NOT NULL,
      ua text NOT NULL DEFAULT '',
      host text NOT NULL DEFAULT '',
      path text NOT NULL,
      method text NOT NULL DEFAULT 'GET',
      status integer NOT NULL
    )
  `
  // `bot` kolonunda BİLEREK CHECK yok: bot listesi (seoDefaults > AI_BOTS)
  // yeni tarayıcı çıktıkça büyüyor ve DB kısıtıyla kod listesini senkron
  // tutmak sessiz 422/500'lerin bilinen kaynağı. Geçerli değerler kod
  // tarafında `detectAiBot` ile belirlenir, DB serbest metin tutar.
  await sql`CREATE INDEX IF NOT EXISTS ai_bot_hits_ts_idx ON ai_bot_hits (ts)`
  await sql`CREATE INDEX IF NOT EXISTS ai_bot_hits_bot_idx ON ai_bot_hits (bot)`
  await sql`CREATE INDEX IF NOT EXISTS ai_bot_hits_status_idx ON ai_bot_hits (status)`
  ensured = true
}

export type BotHit = {
  bot: string
  ua: string
  host: string
  path: string
  method: string
  status: number
}

export async function insertBotHit(sql: Sql, h: BotHit) {
  await sql`
    INSERT INTO ai_bot_hits (bot, ua, host, path, method, status)
    VALUES (${h.bot}, ${h.ua}, ${h.host}, ${h.path}, ${h.method}, ${h.status})
  `
}

// ── Saf yardımcılar (DB'siz, birim test edilebilir) ──────────────────────────

/**
 * Tanınan ajanlar robots.txt'yi üreten listeyle AYNI kaynaktan gelir
 * (seoDefaults > AI_BOTS): panelde bir bota izin verilip verilmediği ile
 * onun ölçüldüğü liste ayrışırsa "engelledim ama hâlâ geliyor" tipi sorular
 * cevapsız kalır. UZUNA GÖRE sıralı: "Applebot-Extended" gibi bir ad,
 * ileride listeye düz "Applebot" da girerse ondan ÖNCE denenmeli, yoksa
 * uzun ad hiç eşleşmez.
 */
const BOT_AGENTS = AI_BOTS.map((b) => b.agent)
  .slice()
  .sort((a, b) => b.length - a.length)
  .map((agent) => ({ agent, low: agent.toLowerCase() }))

/** UA metninde tanınan bir AI tarayıcı varsa kanonik adını döner. */
export function detectAiBot(ua: string): string | null {
  if (!ua) return null
  const low = ua.toLowerCase()
  for (const b of BOT_AGENTS) {
    if (low.includes(b.low)) return b.agent
  }
  return null
}

/**
 * Kaydedilmeyecek yollar.
 *
 * `/api/`: SSR sırasında sayfanın kendi iç `$fetch` çağrıları GELEN İSTEĞİN
 * header'larını miras alır, yani bot UA'sıyla gelen TEK bir sayfa isteği
 * `/api/seo/meta` + `/api/blog/posts` gibi alt isteklerle birlikte birden
 * çok satır üretir (ölçüldü: bir `/beta` isteği 4 satır). Bunlar botun
 * isteği değil bizim kendi render'ımızdır ve sayıları şişirir. Botlar zaten
 * JSON uçlarımızı taramıyor, kayıp sinyal yok.
 *
 * `/__`: Nuxt hata sayfasını `/__nuxt_error?...` iç isteğiyle render ediyor;
 * o alt istek 200 döner ve gerçek 404'ün yerine geçerdi. Plugin o adresi bu
 * filtreye UĞRAMADAN önce ele alır ve gerçek yol/durumu sorgusundan okur.
 *
 * DİKKAT: `.txt` ve `.xml` bilerek DIŞARIDA BIRAKILMADI - robots.txt,
 * sitemap.xml ve llms.txt bu ölçümün en değerli sinyalleridir.
 */
const ATLANAN = /^\/api\/|^\/_nuxt\/|^\/__|\.(png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|map|woff2?|ttf|eot)$/i

export function loglanirMi(path: string): boolean {
  return !ATLANAN.test(path)
}

/** Bot adından sahibi ve amacı (eğitim/arama/kullanici) okunur; bilinmiyorsa null. */
export function botBilgisi(agent: string) {
  return AI_BOTS.find((b) => b.agent === agent) ?? null
}

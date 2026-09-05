import { dbSql, type Sql } from './db'
import type { H3Event } from 'h3'
import { IZLENEN_BOTLAR } from '~~/server/utils/seoDefaults'

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
 * ISR'siz olan yollar (/robots.txt, /sitemap.xml, /llms.txt, /llms-full.txt)
 * çok daha iyi kapsanır ama hepsi eşit değildir, çünkü ISR olmasa da
 * handler'ları `s-maxage` verip CDN'e cache'letiyor:
 *   - /robots.txt   : s-maxage YOK (bu ölçüm için bilerek kaldırıldı) → TAM
 *   - /sitemap.xml  : s-maxage=300 → aynı 5 dk'ya düşen ikinci istek görünmez
 *   - /llms.txt     : s-maxage=300 → aynı
 *   - /llms-full.txt: s-maxage=900 → aynı, 15 dk
 * Tarayıcılar taramaya robots.txt'den başladığı ve orası artık cache'siz
 * olduğu için "hangi bot aktif, ne zaman geldi" nabzı GÜVENİLİRDİR. Sayfa
 * bazlı sayılar ise ALT SINIRDIR, gerçek tarama bundan fazladır.
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

let ensured = false

export function botSql(event: H3Event): Sql | null {
  const url = useRuntimeConfig(event).databaseUrl
  return dbSql(url)
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
  // `bot` kolonunda BİLEREK CHECK yok: liste (seoDefaults > IZLENEN_BOTLAR)
  // yeni tarayıcı çıktıkça büyüyor ve DB kısıtıyla kod listesini senkron
  // tutmak sessiz 422/500'lerin bilinen kaynağı. Geçerli değerler kod
  // tarafında `detectAiBot` ile belirlenir, DB serbest metin tutar. Kısıt
  // olsaydı 24 Ağu'da eklenen `?<jeton>` biçimi de imkânsız olurdu.
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
 * Tanınan ajanlar `seoDefaults > IZLENEN_BOTLAR`dan gelir; bu liste
 * robots.txt'yi üreten `AI_BOTS` ile BİLEREK aynı değildir (ayrımın gerekçesi
 * o dosyada). Kısaca: AI_BOTS "kime izin veriyoruz", IZLENEN_BOTLAR "kim
 * geldi". Ölçüm listesi arama motorlarını da içerir çünkü AI yanıt
 * yüzeylerinin çoğunun ayrı bir tarayıcısı yok.
 *
 * UZUNA GÖRE sıralı ve bu ZORUNLU: "Meta-ExternalFetcher" düz "Applebot"tan
 * önce denenmezse kısa ad uzun adı yer. Bugünkü somut çift
 * `Applebot` ⊂ `Applebot-Extended`, `Bingbot` ⊂ hiçbir şey, ama liste
 * büyüdükçe kural gerekli kalır.
 */
const BOT_AGENTS = IZLENEN_BOTLAR.map((b) => b.agent)
  .slice()
  .sort((a, b) => b.length - a.length)
  .map((agent) => ({ agent, low: agent.toLowerCase() }))

/**
 * Kendini bot ilan eden ama listemizde OLMAYAN UA'ları yakalayan ağ.
 *
 * NEDEN VAR (24 Ağu 2026): whitelist ölçümün en büyük kör noktasıydı. "Hangi
 * botlar geliyor" sorusu ancak listede olanı sayabildiği için, bilmediğimiz
 * bir tarayıcının varlığını ÖĞRENMENİN yolu yoktu. Artık bilinmeyenler
 * `?<jeton>` adıyla birikiyor (jeton UA'daki ürün adından çıkar) ve ham UA
 * zaten `ua` kolonunda duruyor, yani teşhis SQL'le yapılabiliyor.
 *
 * Anahtarlar İNSAN TARAYICISINDA GEÇMEYECEK şekilde daraltıldı: Chrome,
 * Safari ve Firefox UA'larının hiçbiri bu kelimeleri taşımıyor. `index`,
 * `preview` ve `feed` BİLEREK yok (yanlış pozitif riski taşıyorlar), aynı
 * şekilde `curl`, `python-requests`, `node-fetch` gibi script istemcileri de
 * dışarıda: onlar kendini bot ilan etmiyor ve tabloyu gürültüye çevirirdi.
 *
 * SINIR: jeton UA'dan geliyor, yani taklit edilebilir ve teoride sonsuz
 * çeşitlilik üretilebilir. Jeton 40 karakterle sınırlı; kardinalite bir sorun
 * olursa çözüm IP doğrulaması, jetonu kısaltmak değil.
 */
const BOT_ANAHTARI = /(?:bot|crawler|crawl|spider|fetcher|scraper|slurp|archiver)/i
/** UA'nın en başındaki ürün adı: `Barkrowler/0.9 (…)` → `Barkrowler`. */
const ILK_URUN = /^([A-Za-z0-9][A-Za-z0-9._-]{0,39})\//
/** Anahtar kelimeyi TAŞIYAN ürün adı: `… compatible; SemrushBot/7~bl …` → `SemrushBot`. */
const ANAHTARLI_URUN =
  /([A-Za-z0-9][A-Za-z0-9._-]{0,38}(?:bot|crawler|crawl|spider|fetcher|scraper|slurp|archiver)[A-Za-z0-9._-]{0,10})/i

/**
 * UA metninde bir tarayıcı varsa adını döner: tanınıyorsa kanonik ad,
 * tanınmıyorsa `?<jeton>`. Hiçbir bot işareti yoksa null.
 *
 * Jeton iki adımda aranır ve SIRA önemli. Kendi adında anahtar kelime
 * taşımayan botlar (Barkrowler) yalnız künyesindeki URL'den ele veriyor;
 * o durumda anahtarlı arama "crawler" gibi bir çöp jeton üretirdi, ilk ürün
 * adı ise gerçek adı verir. Tersine `Mozilla/5.0 (compatible; SemrushBot/…)`
 * kalıbında ilk ürün adı "Mozilla"dır ve hiçbir şey söylemez, orada anahtarlı
 * arama doğru cevabı bulur. İkisi de tutmazsa satır `?bilinmeyen` olarak
 * birikir: ham UA `ua` kolonunda durduğu için teşhis yine yapılabilir.
 */
export function detectAiBot(ua: string): string | null {
  if (!ua) return null
  const low = ua.toLowerCase()
  for (const b of BOT_AGENTS) {
    if (low.includes(b.low)) return b.agent
  }
  if (!BOT_ANAHTARI.test(ua)) return null
  const ilk = ILK_URUN.exec(ua)?.[1]
  const jeton = ilk && ilk.toLowerCase() !== 'mozilla' ? ilk : ANAHTARLI_URUN.exec(ua)?.[1]
  return jeton ? `?${jeton.toLowerCase().slice(0, 40)}` : '?bilinmeyen'
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

/**
 * Bot adından sahibi ve amacı (eğitim/arama/kullanici) okunur; bilinmiyorsa
 * null. `?jeton` adlı satırlar bilerek null döner: sahibini bilmiyoruz ve
 * uydurmak, panelde "biliyoruz" izlenimi verirdi.
 */
export function botBilgisi(agent: string) {
  return IZLENEN_BOTLAR.find((b) => b.agent === agent) ?? null
}

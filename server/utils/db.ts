import postgres from 'postgres'

/**
 * Veritabanı bağlantısının TEK kaynağı.
 *
 * NEDEN AYRI BİR KATMAN: eskiden her store kendi `neon(url)`ünü çağırıyordu.
 * `neon()` durumsuz bir HTTP istemcisi olduğu için bu ucuzdu; postgres.js ise
 * bir BAĞLANTI HAVUZU açar. Aynı deseni birebir taşısaydık her istek yeni bir
 * havuz kurar, bağlantılar sızardı. Burada URL başına tek havuz tutuluyor.
 *
 * NEDEN postgres.js: `@neondatabase/serverless` Neon'un HTTP ucuna konuşur,
 * düz bir Postgres sunucusuyla konuşamaz - kendi sunucumuza geçerken
 * `ECONNREFUSED <ip>:443` verdi, çünkü veritabanını HTTPS üzerinden aradı.
 * Göçün amacı Neon'dan bağımsızlık olduğu için sürücü de bağımsız olmalı.
 *
 * `prepare: false` ŞART: Neon'un `-pooler` uçları PgBouncer'dır ve transaction
 * havuzlamada hazırlanmış ifadeler (prepared statements) çalışmaz. dev ve
 * staging Neon'da KALIYOR, yani bu kod iki tarafa da uymak zorunda.
 */
export type Sql = postgres.Sql<Record<string, never>>

let havuz: Sql | null = null
let havuzUrl = ''

export function dbSql(url: string | undefined | null): Sql | null {
  const temiz = String(url ?? '').trim()
  if (!temiz) return null
  if (havuz && havuzUrl === temiz) return havuz

  // URL değiştiyse (yapılandırma yeniden yüklendi) eskisini bırak. Beklemiyoruz:
  // kapanış arka planda tamamlanır, yeni havuz hemen kullanılabilir olmalı.
  if (havuz) void havuz.end({ timeout: 5 }).catch(() => {})

  havuzUrl = temiz
  havuz = postgres(temiz, {
    prepare: false,
    // Nitro tek süreç; havuzu ölçülü tut. Neon pooler tarafında da nazik olur.
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    // NOTICE'ler (CREATE TABLE IF NOT EXISTS ...) logu doldurmasın.
    onnotice: () => {},
  })
  return havuz
}

/**
 * URL yoksa 503 ile düşer.
 *
 * Rotaların ihtiyacı bu: hepsi zaten `if (!url) throw` yazıyordu ama `dbSql`
 * `Sql | null` döndüğü için tip o kontrolü taşımıyor. Store'lar null'ı kendi
 * ele aldığı (ve "DB yoksa sessizce boş dön" davranışı istediği) için orada
 * `dbSql` kullanılmaya devam eder.
 */
export function dbSqlOrFail(url: string | undefined | null): Sql {
  const sql = dbSql(url)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'db_bagli_degil' })
  return sql
}

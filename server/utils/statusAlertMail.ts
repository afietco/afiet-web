import type { Diagnosis } from '~~/server/utils/statusDiagnose'
import type { SearchResult } from '~~/server/utils/statusSearch'

/**
 * Durum uyarı mailinin gövdesi. SAF: veritabanı, ağ, Nuxt auto-import yok -
 * girdi bir olay listesi, çıktı konu + düz metin + HTML. Böylece hem cron
 * içinden çağrılır hem `scripts/durum-uyari-onizleme.mjs` ile tarayıcıda
 * gerçek çıktı olarak okunur (önizleme bir taklit değil, aynı fonksiyon).
 *
 * Mailin sırası bilinçli: NE oldu (kart), NEDEN olmuş olabilir (teşhis),
 * KANIT (ham gövde ve loglar), sonra dışarısı (arama). Yukarıdan aşağı
 * kesinlik azalır; telefonda ilk ekranda yalnız ilk iki katman görünür.
 *
 * Palet afiet-web bülteninin paletidir (afiet-backend `internal/mailui` de
 * aynı tokenları taşır); marka rengi değişirse üç yer birlikte değişir.
 * Kırmızı burada YALNIZ ölçülmüş bir kesinti içindir, ürün diline sızmaz.
 */

/** Uyarının hikâyedeki yeri. Konu satırını ve panel tonunu bu belirler. */
export type AlertKind = 'yeni' | 'kotulesti' | 'suruyor' | 'cozuldu'

export type AlertState = 'down' | 'degraded' | 'up'

export interface AlertItem {
  /** status_checks'teki kimlik: 'db', 'api', 'provider:neon'… */
  component: string
  /** İnsan adı: 'Veritabanı', 'Neon'. */
  name: string
  /** Satır bir sağlayıcı durum sayfasından mı geliyor? */
  provider: boolean
  kind: AlertKind
  /** 'cozuldu' satırlarında bu 'up'tır; ötekilerde bozuk durum. */
  state: AlertState
  /** Proba göre ayrıntı: 'HTTP 503', 'zaman aşımı (8000 ms)', 'Neon: degraded'. */
  detail: string
  latencyMs: number | null
  /** Bozuk durumun başladığı an. */
  startedAt: Date
  /** Kural tablosunun hükmü. Çözülen satırlarda yoktur. */
  diagnosis?: Diagnosis
  /** Yanıtın ham izi: teşhis yanılırsa okunacak olan budur. */
  rawEvidence?: string
}

/** Tur seviyesindeki ekler: bileşene değil, ana bir kaynağa aittir. */
export interface AlertContext {
  healthy?: string[]
  /** Cloud Run'ın son hata satırları. */
  logs?: string[]
  /** Canlı web araması (yalnız yeni olayda, olay başına bir kez). */
  search?: { query: string; result: SearchResult }
}

export interface AlertMail {
  subject: string
  text: string
  html: string
}

const PALETTE = {
  bg: '#fdfaf3',
  card: '#ffffff',
  ink: '#022c22',
  body: '#322f2a',
  muted: '#605a4f',
  faint: '#97907f',
  line: '#ece4d4',
  accent: '#059669',
  soft: '#f0fdf4',
  warnBg: '#fff7ed',
  warnPen: '#9a3412',
  critBg: '#fef3f2',
  critPen: '#b42318',
  mono: "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
  font: "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
} as const

const DURUM_URL = 'https://afiet.co/durum'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** İstanbul duvar saati: kesintiyi okuyan kişi orada yaşıyor. */
export function saat(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(d)
}

export function tarihSaat(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(d)
}

/** 0-59 dk "12 dk", üstü "2 sa 5 dk". Bir turdan kısası "5 dk"dan aşağı inmez. */
export function sure(fromDate: Date, toDate: Date): string {
  const dk = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 60_000))
  if (dk < 60) return `${dk} dk`
  const sa = Math.floor(dk / 60)
  const kalan = dk % 60
  return kalan === 0 ? `${sa} sa` : `${sa} sa ${kalan} dk`
}

/** Türkçe ondalık: 6200 ms → "6,2 sn". */
function saniye(ms: number): string {
  return `${(ms / 1000).toFixed(1).replace('.', ',')} sn`
}

function durumEtiketi(item: AlertItem): string {
  if (item.state === 'up') return 'çözüldü'
  if (item.provider) return item.state === 'down' ? 'sağlayıcı kesintisi' : 'sağlayıcı uyarısı'
  return item.state === 'down' ? 'kesinti' : 'yavaşlama'
}

/** En kötü önce: kesinti > yavaşlama > sağlayıcı > çözüldü. */
function agirlik(item: AlertItem): number {
  if (item.state === 'up') return 0
  if (item.provider) return item.state === 'down' ? 2 : 1
  return item.state === 'down' ? 4 : 3
}

function sirala(items: AlertItem[]): AlertItem[] {
  return [...items].sort((a, b) => agirlik(b) - agirlik(a))
}

function isimler(items: AlertItem[]): string {
  const list = items.map((i) => i.name)
  if (list.length <= 2) return list.join(' + ')
  return `${list.slice(0, 2).join(' + ')} +${list.length - 2}`
}

/**
 * Konu satırı bu işin gerçek arayüzüdür: telefon bildiriminde çoğu zaman
 * görülen tek şey odur. Kural, ilk kelimeden ne olduğunun anlaşılması ve
 * `[afiet]` önekiyle Gmail'de tek filtreye takılabilmesidir.
 */
export function buildSubject(items: AlertItem[], now: Date): string {
  const sorted = sirala(items)
  const aktif = sorted.filter((i) => i.state !== 'up')
  const cozulen = sorted.filter((i) => i.state === 'up')

  if (aktif.length === 0) {
    const en = cozulen[0]!
    const sureMetni = cozulen.length === 1 ? ` (${sure(en.startedAt, now)} sürdü)` : ''
    return `[afiet] Çözüldü: ${isimler(cozulen)}${sureMetni}`
  }

  const bas = aktif[0]!
  const hepsiSuruyor = aktif.every((i) => i.kind === 'suruyor')
  const ek = hepsiSuruyor ? ` sürüyor (${sure(bas.startedAt, now)})` : ''

  if (!bas.provider && bas.state === 'down') return `[afiet] KESİNTİ${ek}: ${isimler(aktif)}`
  if (!bas.provider) return `[afiet] Yavaşlama${ek}: ${isimler(aktif)}`
  return `[afiet] Sağlayıcı uyarısı${ek}: ${isimler(aktif)}`
}

const GUVEN_ETIKET: Record<Diagnosis['confidence'], string> = {
  kesin: 'sebep belli',
  muhtemel: 'muhtemel sebep',
  tahmin: 'tahmin',
}

function satirMetni(item: AlertItem, now: Date): string {
  const parts = [`${item.name}: ${durumEtiketi(item)}`]
  if (item.detail) parts.push(item.detail)
  if (item.latencyMs !== null && item.state !== 'up') parts.push(saniye(item.latencyMs))
  parts.push(
    item.state === 'up'
      ? `${saat(item.startedAt)} - ${saat(now)}, ${sure(item.startedAt, now)} sürdü`
      : `${saat(item.startedAt)}'ten beri (${sure(item.startedAt, now)})`,
  )
  const lines = [`- ${parts.join(' · ')}`]
  if (item.diagnosis) {
    lines.push(`  ${GUVEN_ETIKET[item.diagnosis.confidence]}: ${item.diagnosis.cause}`)
    lines.push(`  ne yapılır: ${item.diagnosis.action}`)
    for (const l of item.diagnosis.links) lines.push(`  ${l.label}: ${l.url}`)
  }
  if (item.rawEvidence) lines.push(`  yanıt: ${item.rawEvidence}`)
  return lines.join('\n')
}

/**
 * Düz metin sürüm HER ZAMAN gider ve asıl sözleşme odur: bazı istemciler
 * HTML'i kırpar, bildirim önizlemesi de metinden okunur.
 */
export function buildText(items: AlertItem[], now: Date, ctx: AlertContext = {}): string {
  const sorted = sirala(items)
  const lines: string[] = [tarihSaat(now), '']
  for (const item of sorted) lines.push(satirMetni(item, now))
  lines.push('')
  if (ctx.logs && ctx.logs.length > 0) {
    lines.push('Sunucu logları (son hatalar):')
    for (const l of ctx.logs) lines.push(`  ${l}`)
    lines.push('')
  }
  if (ctx.search) {
    lines.push(`İnternette son 24 saat (arama: ${ctx.search.query}):`)
    if (ctx.search.result.answer) lines.push(`  ${ctx.search.result.answer}`)
    for (const h of ctx.search.result.hits) lines.push(`  ${h.title} - ${h.url}`)
    lines.push('')
  }
  if (ctx.healthy && ctx.healthy.length > 0) lines.push(`Ayakta: ${ctx.healthy.join(', ')}`)
  lines.push('')
  lines.push(`Durum sayfası: ${DURUM_URL}`)
  lines.push('')
  lines.push(
    'Bu mail afiet.co durum kontrolünden otomatik geldi (5 dakikada bir). Sorun sürdüğü sürece 30 dakikada bir hatırlatır, toparlanınca "çözüldü" maili gelir.',
  )
  return lines.join('\n')
}

function ton(item: AlertItem): 'crit' | 'warn' | 'soft' {
  if (item.state === 'up') return 'soft'
  if (item.state === 'down' && !item.provider) return 'crit'
  return 'warn'
}

function panel(tone: 'crit' | 'warn' | 'soft' | '', inner: string): string {
  const map = {
    crit: [PALETTE.critBg, '#fecdca'],
    warn: [PALETTE.warnBg, '#fed7aa'],
    soft: [PALETTE.soft, '#a7f3d0'],
    '': [PALETTE.card, PALETTE.line],
  } as const
  const [bg, border] = map[tone]
  return `<div style="background:${bg};border:1px solid ${border};border-radius:14px;padding:16px 18px;margin:0 0 12px">${inner}</div>`
}

function rozet(item: AlertItem): string {
  const t = ton(item)
  const pen = t === 'crit' ? PALETTE.critPen : t === 'warn' ? PALETTE.warnPen : PALETTE.accent
  return `<span style="display:inline-block;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:${pen}">${esc(durumEtiketi(item))}</span>`
}

/** Ham metin blokları (gövde izi, log satırları) tek biçimde görünür. */
function monoBlok(satirlar: string[]): string {
  return `<div style="background:${PALETTE.card};border:1px solid ${PALETTE.line};border-radius:10px;padding:10px 12px;margin:10px 0 0;font-family:${PALETTE.mono};font-size:12px;line-height:1.5;color:${PALETTE.muted};word-break:break-word">${satirlar
    .map((s) => esc(s))
    .join('<br>')}</div>`
}

function teshisHtml(d: Diagnosis): string {
  const linkler = d.links
    .map(
      (l) =>
        `<a href="${esc(l.url)}" style="color:${PALETTE.accent};text-decoration:underline">${esc(l.label)}</a>`,
    )
    .join(' · ')
  return `<div style="margin:12px 0 0;padding:12px 0 0;border-top:1px solid rgba(0,0,0,.06)">
    <div style="font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:${PALETTE.muted}">${esc(GUVEN_ETIKET[d.confidence])}</div>
    <div style="margin:4px 0 0;font-size:15px;color:${PALETTE.body}">${esc(d.cause)}</div>
    <div style="margin:8px 0 0;font-size:14px;color:${PALETTE.muted}"><b style="color:${PALETTE.body}">Ne yapılır:</b> ${esc(d.action)}</div>
    ${linkler ? `<div style="margin:8px 0 0;font-size:14px">${linkler}</div>` : ''}
  </div>`
}

function kartHtml(item: AlertItem, now: Date): string {
  const alt: string[] = []
  if (item.detail) alt.push(esc(item.detail))
  if (item.latencyMs !== null && item.state !== 'up') alt.push(saniye(item.latencyMs))
  const zaman =
    item.state === 'up'
      ? `${saat(item.startedAt)} - ${saat(now)} · ${sure(item.startedAt, now)} sürdü`
      : `${saat(item.startedAt)}'ten beri · ${sure(item.startedAt, now)}`

  return panel(
    ton(item),
    `${rozet(item)}
     <div style="margin:4px 0 0;font-size:19px;font-weight:800;color:${PALETTE.ink}">${esc(item.name)}</div>
     ${alt.length ? `<div style="margin:6px 0 0;font-size:15px;color:${PALETTE.body}">${alt.join(' · ')}</div>` : ''}
     <div style="margin:6px 0 0;font-size:13px;color:${PALETTE.muted}">${esc(zaman)}</div>
     ${item.diagnosis ? teshisHtml(item.diagnosis) : ''}
     ${item.rawEvidence ? monoBlok([item.rawEvidence]) : ''}`,
  )
}

function baslikHtml(text: string): string {
  return `<div style="margin:22px 0 8px;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${PALETTE.muted}">${esc(text)}</div>`
}

function aramaHtml(search: NonNullable<AlertContext['search']>): string {
  const { query, result } = search
  const sonuclar = result.hits
    .map(
      (h) =>
        `<div style="margin:8px 0 0"><a href="${esc(h.url)}" style="color:${PALETTE.accent};text-decoration:underline;font-size:14px">${esc(h.title)}</a><div style="font-size:13px;color:${PALETTE.muted}">${esc(h.snippet)}</div></div>`,
    )
    .join('')
  return `${baslikHtml('İnternette son 24 saat')}
${panel(
  '',
  `${result.answer ? `<div style="font-size:15px;color:${PALETTE.body}">${esc(result.answer)}</div>` : ''}
   ${sonuclar}
   <div style="margin:10px 0 0;font-size:12px;color:${PALETTE.faint}">Arama: "${esc(query)}" · ${esc(result.provider)} · doğrulanmamış, dışarıdan.</div>`,
)}`
}

export function buildHtml(items: AlertItem[], now: Date, ctx: AlertContext = {}): string {
  const sorted = sirala(items)
  const kartlar = sorted.map((i) => kartHtml(i, now)).join('\n')
  const loglar =
    ctx.logs && ctx.logs.length > 0
      ? `${baslikHtml('Sunucu logları')}${monoBlok(ctx.logs)}`
      : ''
  const arama = ctx.search ? aramaHtml(ctx.search) : ''
  const ayakta =
    ctx.healthy && ctx.healthy.length > 0
      ? `<p style="margin:16px 0 0;font-size:14px;color:${PALETTE.muted}">Ayakta: ${esc(ctx.healthy.join(', '))}</p>`
      : ''

  const inner = `<p style="margin:0 0 14px;font-size:14px;color:${PALETTE.muted}">${esc(tarihSaat(now))}</p>
${kartlar}
${loglar}
${arama}
${ayakta}
<p style="margin:22px 0 0">
  <a href="${DURUM_URL}" style="display:inline-block;background:${PALETTE.accent};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:999px">Durum sayfasını aç</a>
</p>`

  return `<body style="margin:0;padding:0;background:${PALETTE.bg}">
<div style="max-width:560px;margin:0 auto;padding:28px 20px;font-family:${PALETTE.font};color:${PALETTE.body};font-size:16px;line-height:1.65">
  <div style="margin-bottom:22px">
    <span style="font-size:22px;font-weight:800;color:${PALETTE.accent}">afiet</span>
    <span style="color:${PALETTE.faint};font-size:13px;font-weight:700"> · durum nöbeti</span>
  </div>
  ${inner}
  <hr style="border:none;border-top:1px solid ${PALETTE.line};margin:28px 0 14px">
  <p style="color:${PALETTE.faint};font-size:13px;margin:0">
    Bu mail afiet.co durum kontrolünden otomatik geldi (5 dakikada bir). Sorun sürdüğü sürece 30 dakikada bir hatırlatır, toparlanınca "çözüldü" maili gelir.
  </p>
</div>
</body>`
}

export function buildAlertMail(items: AlertItem[], now: Date, ctx: AlertContext = {}): AlertMail {
  return {
    subject: buildSubject(items, now),
    text: buildText(items, now, ctx),
    html: buildHtml(items, now, ctx),
  }
}

import type { H3Event } from 'h3'
import type { Sql } from './db'
import { COMPONENTS, PROVIDERS, type CheckResult, type ServiceState } from '~~/server/utils/statusStore'
import { diagnose, type Diagnosis } from '~~/server/utils/statusDiagnose'
import { recentErrorLogs } from '~~/server/utils/statusLogs'
import { searchCause } from '~~/server/utils/statusSearch'
import { buildAlertMail, type AlertContext, type AlertItem } from '~~/server/utils/statusAlertMail'

/**
 * Durum uyarıları: kesinti olduğunda mail atan katman.
 *
 * NEDEN VAR (16 Ağu 2026): 14 Ağustos'ta beş dakikalık iki veritabanı
 * kesintisi yaşandı, durum sayfasına olay olarak düştü ve kimsenin haberi
 * olmadı. Sayfa geçmişi anlatır, uyarı ise bugünü söyler.
 *
 * Kurallar (kullanıcı kararları):
 *  - İlk başarısız kontrolde çıkar, ikinci turu beklemez.
 *  - Kesinti, yavaşlama ve sağlayıcı olayları uyarı üretir; çözüldü de.
 *  - Sorun sürdükçe 30 dakikada bir hatırlatır.
 *  - Tur başına TEK mail: aynı anda üç bileşen düşerse üç mail değil,
 *    üç kartlı tek mail gider.
 *
 * `status_alerts` yalnız "neyi ne zaman haber verdik"i tutar. Olay geçmişi
 * `status_incidents`in işidir; bu tablo silinse sayfa hiç etkilenmez, yalnız
 * bir sonraki turda uyarılar bir kez daha çıkar.
 */

/** Aynı sorun için iki hatırlatma arası. */
const HATIRLATMA_DK = 30

/** Uyarıların gideceği adres (kullanıcı kararı, 16 Ağu 2026: tek adres). */
const ALICI = ['berk@afiet.co']
const GONDEREN = 'afiet durum <uyari@posta.afiet.co>'

const AD: Record<string, string> = {
  ...Object.fromEntries(COMPONENTS.map((c) => [c.id, c.name])),
  ...Object.fromEntries(PROVIDERS.map((p) => [`provider:${p.id}`, p.name])),
}

export interface AlertRow {
  component: string
  state: 'down' | 'degraded'
  detail: string
  startedAt: Date
  notifiedAt: Date
}

/** evaluateAlerts'ın çıktısı: ne haber verilecek ve tabloya ne yazılacak. */
export interface AlertPlan {
  items: AlertItem[]
  upserts: AlertRow[]
  deletes: string[]
}

let ensured = false
export async function ensureAlertTable(sql: Sql) {
  if (ensured) return
  await sql`
    CREATE TABLE IF NOT EXISTS status_alerts (
      component text PRIMARY KEY,
      state text NOT NULL,
      detail text NOT NULL DEFAULT '',
      started_at timestamptz NOT NULL DEFAULT now(),
      notified_at timestamptz NOT NULL DEFAULT now()
    )
  `
  ensured = true
}

export async function readAlertState(sql: Sql): Promise<AlertRow[]> {
  const rows = (await sql`
    SELECT component, state, detail, started_at, notified_at FROM status_alerts
  `) as { component: string; state: string; detail: string; started_at: string; notified_at: string }[]
  return rows.map((r) => ({
    component: r.component,
    state: r.state === 'down' ? 'down' : 'degraded',
    detail: r.detail,
    startedAt: new Date(r.started_at),
    notifiedAt: new Date(r.notified_at),
  }))
}

/**
 * Sağlayıcının durum sayfasına ULAŞAMAMAK sağlayıcının arızası değildir;
 * bizim okuma hatamızdır ve düzenli olarak olur. Şeritte sarı görünür ama
 * uyarı üretmez, yoksa mail kutusu haftada birkaç kez boş yere çalar.
 */
function gurultuMu(r: CheckResult): boolean {
  return r.component.startsWith('provider:') && r.detail === 'durum sayfası okunamadı'
}

const KOTU: Record<string, number> = { degraded: 1, down: 2 }

/**
 * Durum makinesi. SAF: veritabanı ve ağ yok, böylece test edilebilir.
 *
 * Girdi bir önceki turun uyarı durumu ve bu turun kontrolleri; çıktı hangi
 * satırların maile gireceği ve tablonun nasıl güncelleneceği.
 */
export function evaluateAlerts(previous: AlertRow[], results: CheckResult[], now: Date): AlertPlan {
  const onceki = new Map(previous.map((p) => [p.component, p]))
  const items: AlertItem[] = []
  const upserts: AlertRow[] = []
  const deletes: string[] = []

  const bozukSayisi = results.filter(
    (r) => (r.state === 'down' || r.state === 'degraded') && !gurultuMu(r) && !r.component.startsWith('provider:'),
  ).length

  const saglayicilar: Record<string, { state: ServiceState; incident?: string }> = {}
  for (const r of results) {
    if (!r.component.startsWith('provider:')) continue
    if (gurultuMu(r)) continue
    saglayicilar[r.component.slice('provider:'.length)] = {
      state: r.state,
      incident: r.evidence?.incident,
    }
  }

  for (const r of results) {
    const prev = onceki.get(r.component)
    const provider = r.component.startsWith('provider:')
    const ad = AD[r.component] ?? r.component
    const bozuk = (r.state === 'down' || r.state === 'degraded') && !gurultuMu(r)

    if (!bozuk) {
      // Toparlandı: yalnız daha önce haber verdiysek "çözüldü" maili çıkar.
      if (prev) {
        deletes.push(r.component)
        items.push({
          component: r.component,
          name: ad,
          provider,
          kind: 'cozuldu',
          state: 'up',
          detail: '',
          latencyMs: r.latencyMs,
          startedAt: prev.startedAt,
        })
      }
      continue
    }

    const state = r.state as 'down' | 'degraded'
    const startedAt = prev?.startedAt ?? now
    const teshis: Diagnosis = diagnose({
      component: r.component,
      state,
      detail: r.detail,
      evidence: r.evidence,
      providers: saglayicilar,
      brokenCount: bozukSayisi,
    })
    const ham = [r.evidence?.bodySnippet, r.evidence?.networkError, r.evidence?.incident]
      .filter(Boolean)
      .join(' | ')

    const temel = {
      component: r.component,
      name: ad,
      provider,
      state,
      detail: r.detail,
      latencyMs: r.latencyMs,
      startedAt,
      diagnosis: teshis,
      rawEvidence: ham || undefined,
    }

    if (!prev) {
      items.push({ ...temel, kind: 'yeni' })
      upserts.push({ component: r.component, state, detail: r.detail, startedAt, notifiedAt: now })
      continue
    }

    const kotulesti = (KOTU[state] ?? 0) > (KOTU[prev.state] ?? 0)
    const hatirlatmaZamani =
      now.getTime() - prev.notifiedAt.getTime() >= HATIRLATMA_DK * 60_000

    if (kotulesti) {
      items.push({ ...temel, kind: 'kotulesti' })
      upserts.push({ component: r.component, state, detail: r.detail, startedAt, notifiedAt: now })
    } else if (hatirlatmaZamani) {
      items.push({ ...temel, kind: 'suruyor' })
      upserts.push({ component: r.component, state, detail: r.detail, startedAt, notifiedAt: now })
    } else if (state !== prev.state || r.detail !== prev.detail) {
      // Düzelme yönünde değişim (down → degraded) ya da yalnız ayrıntı
      // değişti: tabloyu tazele ama kutuyu çalma, olay zaten haber verildi.
      upserts.push({
        component: r.component,
        state,
        detail: r.detail,
        startedAt,
        notifiedAt: prev.notifiedAt,
      })
    }
  }

  return { items, upserts, deletes }
}

export async function applyAlertState(sql: Sql, plan: AlertPlan) {
  for (const row of plan.upserts) {
    await sql`
      INSERT INTO status_alerts (component, state, detail, started_at, notified_at)
      VALUES (${row.component}, ${row.state}, ${row.detail}, ${row.startedAt.toISOString()}, ${row.notifiedAt.toISOString()})
      ON CONFLICT (component) DO UPDATE
        SET state = EXCLUDED.state,
            detail = EXCLUDED.detail,
            notified_at = EXCLUDED.notified_at
    `
  }
  for (const component of plan.deletes) {
    await sql`DELETE FROM status_alerts WHERE component = ${component}`
  }
}

/**
 * Teşhisin dış kaynakları. İkisi de ISTEĞE BAĞLI ve ikisi de sessizce
 * atlanabilir: mailin gitmesi bunlara bağlanmaz.
 *
 * Loglar yalnız kendi hizmetimiz düştüğünde okunur (sağlayıcı uyarısı için
 * Cloud Run logunda bir şey yoktur). Arama yalnız YENİ ya da kötüleşen bir
 * olayda yapılır: hatırlatmada aynı sorguyu tekrar aramak para ve gürültüdür.
 */
async function ekBaglam(event: H3Event, items: AlertItem[]): Promise<AlertContext> {
  const ctx: AlertContext = {}
  const aktif = items.filter((i) => i.state !== 'up')

  if (aktif.some((i) => i.component === 'api' || i.component === 'db')) {
    const logs = await recentErrorLogs(event, 15, 5)
    if (logs.length > 0) ctx.logs = logs
  }

  const aranacak = aktif.find((i) => (i.kind === 'yeni' || i.kind === 'kotulesti') && i.diagnosis?.query)
  if (aranacak?.diagnosis?.query) {
    const result = await searchCause(event, aranacak.diagnosis.query)
    if (result) ctx.search = { query: aranacak.diagnosis.query, result }
  }

  return ctx
}

async function sendAlertMail(event: H3Event, items: AlertItem[], now: Date, healthy: string[]) {
  const apiKey = String(useRuntimeConfig(event).resendApiKey ?? '').trim()
  if (!apiKey) {
    console.warn('[durum] RESEND anahtarı yok; uyarı gönderilemedi:', items.map((i) => i.name).join(', '))
    return
  }

  const ctx = await ekBaglam(event, items)
  ctx.healthy = healthy
  const mail = buildAlertMail(items, now, ctx)

  try {
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        from: GONDEREN,
        to: ALICI,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        // Acil kutusuna düşsün diye: Gmail bunu kendi başına öne çıkarmaz ama
        // filtre kurmayı ve istemcilerin önemli işaretini mümkün kılar.
        headers: { 'X-Priority': '1', Importance: 'high' },
      },
    })
  } catch (err) {
    console.error('[durum] uyarı maili gönderilemedi:', err instanceof Error ? err.message : err)
  }
}

/**
 * Cron turunun uyarı adımı. Kontroller yazıldıktan SONRA çağrılır ve
 * hiçbir koşulda turu düşürmez: uyarı katmanının hatası, durum sayfasının
 * verisini bozmamalı.
 */
export async function runStatusAlerts(
  event: H3Event,
  sql: Sql,
  results: CheckResult[],
  now: Date = new Date(),
): Promise<{ notified: string[] }> {
  try {
    await ensureAlertTable(sql)
    const previous = await readAlertState(sql)
    const plan = evaluateAlerts(previous, results, now)
    if (plan.items.length === 0) {
      await applyAlertState(sql, plan)
      return { notified: [] }
    }

    const healthy = results
      .filter((r) => r.state === 'up' && !r.component.startsWith('provider:'))
      .map((r) => AD[r.component] ?? r.component)

    await sendAlertMail(event, plan.items, now, healthy)
    await applyAlertState(sql, plan)
    return { notified: plan.items.map((i) => `${i.component}:${i.kind}`) }
  } catch (err) {
    console.error('[durum] uyarı katmanı düştü:', err instanceof Error ? err.message : err)
    return { notified: [] }
  }
}

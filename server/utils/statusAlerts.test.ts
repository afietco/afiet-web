import { describe, expect, it } from 'vitest'
import { evaluateAlerts, type AlertRow } from './statusAlerts'
import type { CheckResult } from './statusStore'

/**
 * Uyarı durum makinesi. Buradaki her senaryonun karşılığı gerçek bir
 * kutu davranışıdır: eşiği kaydıran bir değişiklik ya sabahın 3'ünde
 * gereksiz mail atar ya da 14 Ağustos'taki gibi hiç atmaz.
 */
const T = (hhmm: string) => new Date(`2026-08-14T${hhmm}:00+03:00`)

const down = (component: string, detail = 'HTTP 503'): CheckResult => ({
  component,
  state: 'down',
  latencyMs: null,
  detail,
  evidence: { status: 503, bodySnippet: '{"status":"unavailable","reason":"db ping başarısız"}' },
})

const up = (component: string): CheckResult => ({
  component,
  state: 'up',
  latencyMs: 120,
  detail: '',
})

const row = (component: string, over: Partial<AlertRow> = {}): AlertRow => ({
  component,
  state: 'down',
  detail: 'HTTP 503',
  startedAt: T('11:55'),
  notifiedAt: T('11:55'),
  ...over,
})

describe('evaluateAlerts', () => {
  it('ilk başarısız kontrolde haber verir, ikinci turu beklemez', () => {
    const plan = evaluateAlerts([], [down('db'), up('web')], T('11:55'))
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0]!.kind).toBe('yeni')
    expect(plan.items[0]!.name).toBe('Veritabanı')
    expect(plan.upserts).toHaveLength(1)
  })

  it('haber verilmiş bir sorun için beş dakika sonra tekrar mail atmaz', () => {
    const plan = evaluateAlerts([row('db')], [down('db')], T('12:00'))
    expect(plan.items).toHaveLength(0)
  })

  it('otuz dakika dolunca hatırlatır ve süreyi ilk düşüşten sayar', () => {
    const plan = evaluateAlerts([row('db')], [down('db')], T('12:25'))
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0]!.kind).toBe('suruyor')
    expect(plan.items[0]!.startedAt).toEqual(T('11:55'))
  })

  it('yavaşlama kesintiye dönerse eşiği beklemeden konuşur', () => {
    const plan = evaluateAlerts(
      [row('api', { state: 'degraded', detail: 'yavaş yanıt (6200 ms)' })],
      [down('api')],
      T('11:57'),
    )
    expect(plan.items[0]!.kind).toBe('kotulesti')
  })

  it('kesinti yavaşlamaya dönerse kutuyu çalmaz ama satırı tazeler', () => {
    const plan = evaluateAlerts(
      [row('api')],
      [{ component: 'api', state: 'degraded', latencyMs: 5200, detail: 'yavaş yanıt (5200 ms)' }],
      T('11:57'),
    )
    expect(plan.items).toHaveLength(0)
    expect(plan.upserts[0]!.state).toBe('degraded')
    expect(plan.upserts[0]!.notifiedAt).toEqual(T('11:55'))
  })

  it('toparlanınca çözüldü maili atar ve satırı siler', () => {
    const plan = evaluateAlerts([row('db')], [up('db')], T('12:00'))
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0]!.kind).toBe('cozuldu')
    expect(plan.items[0]!.state).toBe('up')
    expect(plan.deletes).toEqual(['db'])
  })

  it('hiç haber verilmemiş bileşen ayaktaysa sessiz kalır', () => {
    const plan = evaluateAlerts([], [up('db'), up('api')], T('12:00'))
    expect(plan.items).toHaveLength(0)
    expect(plan.upserts).toHaveLength(0)
  })

  it('aynı turda iki bileşen düşerse ikisi de TEK mailin içindedir', () => {
    const plan = evaluateAlerts([], [down('db'), down('api')], T('11:55'))
    expect(plan.items.map((i) => i.component).sort()).toEqual(['api', 'db'])
  })

  it('sağlayıcının durum sayfasına ulaşılamaması uyarı üretmez', () => {
    const plan = evaluateAlerts(
      [],
      [{ component: 'provider:vercel', state: 'degraded', latencyMs: null, detail: 'durum sayfası okunamadı' }],
      T('11:55'),
    )
    expect(plan.items).toHaveLength(0)
  })

  it('sağlayıcı gerçekten olay bildirirse uyarı üretir', () => {
    const plan = evaluateAlerts(
      [],
      [
        {
          component: 'provider:neon',
          state: 'degraded',
          latencyMs: null,
          detail: 'Neon: degraded performance',
          evidence: { incident: 'Elevated connection errors in eu-central-1' },
        },
      ],
      T('11:55'),
    )
    expect(plan.items).toHaveLength(1)
    expect(plan.items[0]!.provider).toBe(true)
    expect(plan.items[0]!.diagnosis?.confidence).toBe('kesin')
  })

  it('sağlayıcı olay bildirirken bileşenin teşhisi sebebi ona bağlar', () => {
    const plan = evaluateAlerts(
      [],
      [
        down('db'),
        {
          component: 'provider:neon',
          state: 'down',
          latencyMs: null,
          detail: 'Neon: major outage',
          evidence: { incident: 'Compute unavailable' },
        },
      ],
      T('11:55'),
    )
    const db = plan.items.find((i) => i.component === 'db')!
    expect(db.diagnosis?.confidence).toBe('kesin')
    expect(db.diagnosis?.cause).toContain('Neon')
  })

  it('kendi readyz sebebimizi tanır ve kural tablosundan cevap verir', () => {
    const plan = evaluateAlerts([], [down('db')], T('11:55'))
    expect(plan.items[0]!.diagnosis?.confidence).toBe('muhtemel')
    expect(plan.items[0]!.diagnosis?.cause).toContain('Neon')
    expect(plan.items[0]!.rawEvidence).toContain('db ping başarısız')
  })
})

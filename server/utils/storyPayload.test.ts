import { describe, expect, it } from 'vitest'
import { parseStoryPayload } from './storyPayload'

/**
 * Şablonun geometrisi bu ayrıştırıcıda yaşar ve backend'deki
 * ValidateStoryPayload ile AYNI sınırları taşımak zorundadır: iki taraf
 * ayrışırsa backend'in onayladığı bir payload burada sessizce yok sayılır
 * ve story "var ama render edilmiyor" diye görünür.
 */

const valid = () => ({
  kind: 'chips',
  mood: 'cream',
  hook: 'besin grupları\nnelerdir?',
  accent: 'nelerdir?',
  sub: '5 grubu renkleriyle tanı',
  chips: [
    { emoji: '🥛', label: 'süt' },
    { emoji: '🥦', label: 'sebze' },
    { emoji: '🌾', label: 'tahıl' },
  ],
})

describe('parseStoryPayload', () => {
  it('geçerli payload olduğu gibi geçer', () => {
    const p = parseStoryPayload(valid())
    expect(p).not.toBeNull()
    expect(p?.mood).toBe('cream')
    expect(p?.chips).toHaveLength(3)
  })

  it('alanları kırpar ama düzeltmeye çalışmaz', () => {
    const p = parseStoryPayload({ ...valid(), sub: '  vaat  ' })
    expect(p?.sub).toBe('vaat')
  })

  it.each([
    ['bilinmeyen mood', { mood: 'mavi' }],
    ['üç satır hook', { hook: 'bir\niki\nüç' }],
    ['uzun hook satırı', { hook: 'bu satır on sekiz karakterden çok daha uzun' }],
    ['hook içinde geçmeyen accent', { accent: 'başka' }],
    ['boş sub', { sub: '   ' }],
    ['110 karakteri aşan sub', { sub: 'x'.repeat(111) }],
    ['iki chip', { chips: valid().chips.slice(0, 2) }],
    [
      'altı chip',
      { chips: [...valid().chips, ...valid().chips] },
    ],
    ['uzun chip etiketi', { chips: [{ emoji: '🥦', label: 'onikikarakterdenuzun' }, ...valid().chips.slice(1)] }],
    ['emojisiz chip', { chips: [{ emoji: ' ', label: 'sebze' }, ...valid().chips.slice(1)] }],
  ])('%s reddedilir', (_name, patch) => {
    expect(parseStoryPayload({ ...valid(), ...patch })).toBeNull()
  })

  it('kind eksikse chips sayılır (geri uyum)', () => {
    const { kind: _kind, ...eski } = valid()
    const p = parseStoryPayload(eski)
    expect(p?.kind).toBe('chips')
  })

  it('bilinmeyen kind reddedilir', () => {
    expect(parseStoryPayload({ ...valid(), kind: 'poster' })).toBeNull()
  })

  it('soru: büyük emoji + 2-3 şık ister', () => {
    const soru = {
      kind: 'soru', mood: 'emerald',
      hook: 'tavuk nereye\ngirer?', accent: 'girer?',
      sub: 'protein mi, yoksa daha fazlası mı',
      buyukEmoji: '🍗', secenekler: ['protein', 'tahıl'],
    }
    expect(parseStoryPayload(soru)).not.toBeNull()
    expect(parseStoryPayload({ ...soru, secenekler: ['tek'] })).toBeNull()
    expect(parseStoryPayload({ ...soru, buyukEmoji: ' ' })).toBeNull()
    expect(parseStoryPayload({ ...soru, secenekler: ['on dört karakteri aşan şık'] })).toBeNull()
  })

  it('mit: sanılan + gerçek ister ve sınırlar ayrı', () => {
    const mit = {
      kind: 'mit', mood: 'cream',
      hook: 'kısıtlama\nişe yarar mı?', accent: 'işe yarar mı?',
      sub: 'diyet yapmadan sağlıklı kalmanın yolu',
      sanilan: 'sıkı kısıtlama zayıflatır', gercek: 'kısıtlama geri teper, denge kalıcıdır',
    }
    expect(parseStoryPayload(mit)).not.toBeNull()
    expect(parseStoryPayload({ ...mit, sanilan: '' })).toBeNull()
    expect(parseStoryPayload({ ...mit, gercek: 'x'.repeat(73) })).toBeNull()
  })

  it('adimlar: 3-4 adım, her satır tek nefes', () => {
    const adim = {
      kind: 'adimlar', mood: 'cream',
      hook: 'su ihtiyacın\nkaç bardak?', accent: 'kaç bardak?',
      sub: 'üç adımda kendi ölçünü bul',
      adimlar: [
        { emoji: '⚖️', text: 'kilonu yaz' },
        { emoji: '🏃', text: 'gününü seç' },
        { emoji: '🥤', text: 'bardağa çevir' },
      ],
    }
    expect(parseStoryPayload(adim)).not.toBeNull()
    expect(parseStoryPayload({ ...adim, adimlar: adim.adimlar.slice(0, 2) })).toBeNull()
    expect(parseStoryPayload({ ...adim, adimlar: [...adim.adimlar, ...adim.adimlar] })).toBeNull()
    expect(
      parseStoryPayload({ ...adim, adimlar: [{ emoji: '⚖️', text: 'otuz karakterden çok daha uzun bir adım satırı' }, ...adim.adimlar.slice(1)] }),
    ).toBeNull()
  })

  it('nesne olmayan girdiler null döner', () => {
    expect(parseStoryPayload(null)).toBeNull()
    expect(parseStoryPayload('json değil')).toBeNull()
    expect(parseStoryPayload(undefined)).toBeNull()
  })
})

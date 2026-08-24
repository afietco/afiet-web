import { describe, expect, it } from 'vitest'
import { parseStoryPayload } from './storyPayload'

/**
 * Şablonun geometrisi bu ayrıştırıcıda yaşar ve backend'deki
 * ValidateStoryPayload ile AYNI sınırları taşımak zorundadır: iki taraf
 * ayrışırsa backend'in onayladığı bir payload burada sessizce yok sayılır
 * ve story "var ama render edilmiyor" diye görünür.
 */

const valid = () => ({
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

  it('nesne olmayan girdiler null döner', () => {
    expect(parseStoryPayload(null)).toBeNull()
    expect(parseStoryPayload('json değil')).toBeNull()
    expect(parseStoryPayload(undefined)).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { channelFor, sanitizeClick } from './analyticsStore'

describe('sanitizeClick', () => {
  it('kabul eder: gclid/gbraid/wbraid + URL-güvenli kimlik', () => {
    expect(sanitizeClick({ k: 'gclid', v: 'Cj0KCQjw_abc123-XYZ' })).toEqual({ kind: 'gclid', id: 'Cj0KCQjw_abc123-XYZ' })
    expect(sanitizeClick({ k: 'gbraid', v: '0AAAAAo1234567890abc' })?.kind).toBe('gbraid')
    expect(sanitizeClick({ k: 'wbraid', v: ' 0AAAAAo1234567890abc ' })?.id).toBe('0AAAAAo1234567890abc')
  })
  it('reddeder: bilinmeyen tür, kısa/uzun/kirli kimlik, eksik gövde', () => {
    expect(sanitizeClick(null)).toBeNull()
    expect(sanitizeClick('gclid=abc')).toBeNull()
    expect(sanitizeClick({ k: 'fbclid', v: 'Cj0KCQjw_abc123-XYZ' })).toBeNull()
    expect(sanitizeClick({ k: 'gclid', v: 'kisa' })).toBeNull()
    expect(sanitizeClick({ k: 'gclid', v: 'a'.repeat(201) })).toBeNull()
    expect(sanitizeClick({ k: 'gclid', v: 'Cj0K<script>alert(1)' })).toBeNull()
    expect(sanitizeClick({ k: 'gclid' })).toBeNull()
  })
})

describe('channelFor (reklam tıklamasında değişmez)', () => {
  it('UTM varsa kampanya, yoksa yönlendirene bakar', () => {
    expect(channelFor({ hasUtm: true, refHost: 'google.com', ourHost: 'afiet.co' })).toBe('campaign')
    expect(channelFor({ hasUtm: false, refHost: 'google.com', ourHost: 'afiet.co' })).toBe('search')
  })
})

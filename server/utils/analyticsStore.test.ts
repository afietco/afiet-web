import { describe, expect, it } from 'vitest'
import { channelFor, isAiHost, isLikelyAiEntry, sanitizeClick } from './analyticsStore'

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

describe('isAiHost', () => {
  it('yapay zeka yüzeylerini tanır (alt alan adı dahil)', () => {
    expect(isAiHost('chatgpt.com')).toBe(true)
    expect(isAiHost('perplexity.ai')).toBe(true)
    expect(isAiHost('gemini.google.com')).toBe(true)
    expect(isAiHost('claude.ai')).toBe(true)
    expect(isAiHost('copilot.microsoft.com')).toBe(true)
    expect(isAiHost('edgeservices.bing.com')).toBe(true)
    expect(isAiHost('x.chatgpt.com')).toBe(true)
  })
  it('benzeyen ama alakasız hostları tanımaz', () => {
    expect(isAiHost('google.com')).toBe(false)
    expect(isAiHost('bing.com')).toBe(false)
    expect(isAiHost('x.com')).toBe(false)
    // Alt alan adı eşleşmesi sondan yapılır: uydurma bir alan adı geçemez.
    expect(isAiHost('openai.com.kotu-site.net')).toBe(false)
    expect(isAiHost('notchatgpt.com')).toBe(false)
  })
})

describe('channelFor > yapay zeka kanalı', () => {
  it('AI yüzeyleri kendi kanalını alır', () => {
    expect(channelFor({ hasUtm: false, refHost: 'chatgpt.com', ourHost: 'afiet.co' })).toBe('ai')
    expect(channelFor({ hasUtm: false, refHost: 'perplexity.ai', ourHost: 'afiet.co' })).toBe('ai')
    expect(channelFor({ hasUtm: false, refHost: 'claude.ai', ourHost: 'afiet.co' })).toBe('ai')
  })
  it('SIRA: gemini ve copilot arama/sosyal desenlerinden ÖNCE yakalanır', () => {
    // Bu iki satır regresyon nöbetçisidir: `gemini.google.com` arama
    // listesindeki `google.` desenine, `edgeservices.bing.com` da `bing.`
    // desenine uyuyor. AI kontrolü öne alınmazsa ikisi de "arama" sayılır ve
    // yapay zeka trafiği organik aramanın içinde kaybolur.
    expect(channelFor({ hasUtm: false, refHost: 'gemini.google.com', ourHost: 'afiet.co' })).toBe('ai')
    expect(channelFor({ hasUtm: false, refHost: 'edgeservices.bing.com', ourHost: 'afiet.co' })).toBe('ai')
  })
  it('etiketli bağlantı hâlâ kampanyadır', () => {
    expect(channelFor({ hasUtm: true, refHost: 'chatgpt.com', ourHost: 'afiet.co' })).toBe('campaign')
  })
})

describe('isLikelyAiEntry (sezgisel, geniş tanım)', () => {
  const taban = { channel: 'direct', isEntry: true, isNewVisitor: true, path: '/blog/tahillar-grubu' }
  it('sayar: referrer taşımayan yeni ziyaretçinin ana sayfa dışına inişi', () => {
    expect(isLikelyAiEntry(taban)).toBe(true)
    expect(isLikelyAiEntry({ ...taban, path: '/destek/baslangic' })).toBe(true)
    expect(isLikelyAiEntry({ ...taban, path: '/hesapla/gunluk-su' })).toBe(true)
    expect(isLikelyAiEntry({ ...taban, path: '/blog' })).toBe(true)
    expect(isLikelyAiEntry({ ...taban, path: '/durum' })).toBe(true)
  })
  it('saymaz: ana sayfa, işlemsel yollar, dönen ziyaretçi, giriş olmayan görüntüleme', () => {
    expect(isLikelyAiEntry({ ...taban, path: '/' })).toBe(false)
    expect(isLikelyAiEntry({ ...taban, path: '/e-posta-dogrula/prod' })).toBe(false)
    expect(isLikelyAiEntry({ ...taban, path: '/sifre-yenile/prod' })).toBe(false)
    expect(isLikelyAiEntry({ ...taban, path: '/bulten/onay' })).toBe(false)
    expect(isLikelyAiEntry({ ...taban, path: '/katil/GYXQGNEG' })).toBe(false)
    expect(isLikelyAiEntry({ ...taban, isNewVisitor: false })).toBe(false)
    expect(isLikelyAiEntry({ ...taban, isEntry: false })).toBe(false)
  })
  it('saymaz: referrer taşıyan hiçbir giriş (ölçülen kanal varken tahmine gerek yok)', () => {
    expect(isLikelyAiEntry({ ...taban, channel: 'ai' })).toBe(false)
    expect(isLikelyAiEntry({ ...taban, channel: 'search' })).toBe(false)
    expect(isLikelyAiEntry({ ...taban, channel: 'campaign' })).toBe(false)
  })
  it('dışlanan öneki içeren ama farklı olan yol sayılır', () => {
    // `/katil` dışlanıyor ama `/katilim-kosullari` gibi bir yol açılırsa
    // önek eşleşmesi onu yanlışlıkla elememeli.
    expect(isLikelyAiEntry({ ...taban, path: '/katilim-kosullari' })).toBe(true)
  })
})

/**
 * Blog yazısının Instagram story payload'ı: içerik hattının story ajanı
 * doldurur, /story/<slug>.png bundan çizer.
 *
 * Sözleşmenin İKİ tarafı var: afiet-backend internal/content/story.go bu
 * şemanın birebir aynasıdır (contentTypes ↔ admin kuralıyla aynı disiplin).
 * Alan eklerken iki ucu birlikte güncelle.
 *
 * ŞABLON AİLESİ: iskelet sabittir (marka şeridi, rozet, başlık, alt cümle,
 * CTA, adres), orta sahne yazının TÜRÜNE göre değişir ve türü ajan seçer:
 *   - chips:   gruplar/öğeler sayan yazı; 3-5 emoji diski
 *   - soru:    bir soruyu cevaplayan yazı; büyük merkez disk + şık pill'leri
 *   - mit:     bir yanlışı düzelten yazı; "sanılan / gerçek" iki kart
 *   - adimlar: nasıl-yapılır yazısı; 3-4 numaralı adım
 *
 * Sınırlar tasarımdan gelir, zevkten değil: şablon el işidir ve ölçüleri
 * sabittir (afiet-brand/social/templates/story-blog.html soyundan). Taşan
 * alan bu doğrulamaya takılır; şablona "esneme" öğretilmez.
 */

export type StoryMood = 'emerald' | 'cream'
export type StoryKind = 'chips' | 'soru' | 'mit' | 'adimlar'

export type StoryChip = {
  /** Diskin içindeki tek emoji (👍 gibi jest ya da 🥦 gibi besin). */
  emoji: string
  /** Diskin altındaki kısa etiket; tek kelime idealdir. */
  label: string
}

export type StoryStep = {
  /** Adım satırının emojisi. */
  emoji: string
  /** Adımın tek satırlık metni. */
  text: string
}

export type StoryPayload = {
  /** Orta sahnenin türü. Eski payload'larda alan yok; 'chips' sayılır. */
  kind: StoryKind
  mood: StoryMood
  /**
   * Story başlığı. '\n' satır kırar (en fazla iki satır); sondaki emoji
   * serbesttir. Yazı başlığının kopyası DEĞİL, kancasıdır.
   */
  hook: string
  /** Hook içinde vurgulanacak parça; hook'ta birebir geçmek zorundadır. */
  accent: string
  /** Alt cümle: tek nefeste okunan vaat. */
  sub: string
  /** kind=chips: 3-5 disk. */
  chips?: StoryChip[]
  /** kind=soru: merkez diskin tek emojisi. */
  buyukEmoji?: string
  /** kind=soru: 2-3 kısa şık; anket havası verir, sticker değildir. */
  secenekler?: string[]
  /** kind=mit: yaygın yanlış (üstü çizilmez, sönük durur). */
  sanilan?: string
  /** kind=mit: yazının düzelttiği gerçek. */
  gercek?: string
  /** kind=adimlar: 3-4 numaralı adım. */
  adimlar?: StoryStep[]
}

const MOODS: StoryMood[] = ['emerald', 'cream']
const KINDS: StoryKind[] = ['chips', 'soru', 'mit', 'adimlar']

/** Hook satır başına sığan en uzun metin (106px, 900 ağırlık, 900px alan). */
const HOOK_LINE_MAX = 18
const HOOK_LINES_MAX = 2
const SUB_MAX = 110
const CHIP_LABEL_MAX = 12
const CHIPS_MIN = 3
const CHIPS_MAX = 5
const SECENEK_MAX = 14
const SECENEKLER_MIN = 2
const SECENEKLER_MAX = 3
const SANILAN_MAX = 64
const GERCEK_MAX = 72
const ADIM_TEXT_MAX = 30
const ADIMLAR_MIN = 3
const ADIMLAR_MAX = 4

const runes = (s: string) => [...s].length

/**
 * Bilinmeyen girdiyi StoryPayload'a ayrıştırır; uymayan her şeyde null.
 * Sessizce düzeltmez: kırpılmış bir metin ajanın hatasını gizler ve o hata
 * düzeltilmek yerine yayınlanır.
 */
export function parseStoryPayload(input: unknown): StoryPayload | null {
  if (typeof input !== 'object' || input === null) return null
  const o = input as Record<string, unknown>

  const kind = o.kind === undefined ? 'chips' : o.kind
  if (typeof kind !== 'string' || !KINDS.includes(kind as StoryKind)) return null

  const mood = o.mood
  if (typeof mood !== 'string' || !MOODS.includes(mood as StoryMood)) return null

  const hook = typeof o.hook === 'string' ? o.hook.trim() : ''
  if (!hook) return null
  const lines = hook.split('\n').map((l) => l.trim())
  if (lines.length > HOOK_LINES_MAX) return null
  if (lines.some((l) => !l || runes(l) > HOOK_LINE_MAX)) return null

  const accent = typeof o.accent === 'string' ? o.accent.trim() : ''
  const joined = lines.join('\n')
  if (!accent || !joined.includes(accent)) return null

  const sub = typeof o.sub === 'string' ? o.sub.trim() : ''
  if (!sub || runes(sub) > SUB_MAX) return null

  const out: StoryPayload = { kind: kind as StoryKind, mood: mood as StoryMood, hook: joined, accent, sub }

  switch (out.kind) {
    case 'chips': {
      if (!Array.isArray(o.chips)) return null
      if (o.chips.length < CHIPS_MIN || o.chips.length > CHIPS_MAX) return null
      const chips: StoryChip[] = []
      for (const raw of o.chips) {
        if (typeof raw !== 'object' || raw === null) return null
        const c = raw as Record<string, unknown>
        const emoji = typeof c.emoji === 'string' ? c.emoji.trim() : ''
        const label = typeof c.label === 'string' ? c.label.trim() : ''
        if (!emoji || !label || runes(label) > CHIP_LABEL_MAX) return null
        chips.push({ emoji, label })
      }
      out.chips = chips
      return out
    }
    case 'soru': {
      const buyukEmoji = typeof o.buyukEmoji === 'string' ? o.buyukEmoji.trim() : ''
      if (!buyukEmoji) return null
      if (!Array.isArray(o.secenekler)) return null
      if (o.secenekler.length < SECENEKLER_MIN || o.secenekler.length > SECENEKLER_MAX) return null
      const secenekler: string[] = []
      for (const raw of o.secenekler) {
        const s = typeof raw === 'string' ? raw.trim() : ''
        if (!s || runes(s) > SECENEK_MAX) return null
        secenekler.push(s)
      }
      out.buyukEmoji = buyukEmoji
      out.secenekler = secenekler
      return out
    }
    case 'mit': {
      const sanilan = typeof o.sanilan === 'string' ? o.sanilan.trim() : ''
      const gercek = typeof o.gercek === 'string' ? o.gercek.trim() : ''
      if (!sanilan || runes(sanilan) > SANILAN_MAX) return null
      if (!gercek || runes(gercek) > GERCEK_MAX) return null
      out.sanilan = sanilan
      out.gercek = gercek
      return out
    }
    case 'adimlar': {
      if (!Array.isArray(o.adimlar)) return null
      if (o.adimlar.length < ADIMLAR_MIN || o.adimlar.length > ADIMLAR_MAX) return null
      const adimlar: StoryStep[] = []
      for (const raw of o.adimlar) {
        if (typeof raw !== 'object' || raw === null) return null
        const a = raw as Record<string, unknown>
        const emoji = typeof a.emoji === 'string' ? a.emoji.trim() : ''
        const text = typeof a.text === 'string' ? a.text.trim() : ''
        if (!emoji || !text || runes(text) > ADIM_TEXT_MAX) return null
        adimlar.push({ emoji, text })
      }
      out.adimlar = adimlar
      return out
    }
  }
  return null
}

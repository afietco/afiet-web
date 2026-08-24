/**
 * Blog yazısının Instagram story payload'ı: içerik hattının story ajanı
 * doldurur, /story/<slug>.png bundan çizer.
 *
 * Sözleşmenin İKİ tarafı var: afiet-backend internal/content/story.go bu
 * şemanın birebir aynasıdır (contentTypes ↔ admin kuralıyla aynı disiplin).
 * Alan eklerken iki ucu birlikte güncelle.
 *
 * Sınırlar tasarımdan gelir, zevkten değil: şablon el işidir ve ölçüleri
 * sabittir (afiet-brand/social/templates/story-blog.html). Hook 106px
 * puntoyla iki satırı, chip sırası beş diski aşarsa kompozisyon bozulur.
 * Ajan taşarsa bu doğrulamaya takılır; şablona "esneme" öğretilmez.
 */

export type StoryMood = 'emerald' | 'cream'

export type StoryChip = {
  /** Diskin içindeki tek emoji (👍 gibi jest ya da 🥦 gibi besin). */
  emoji: string
  /** Diskin altındaki kısa etiket; tek kelime idealdir. */
  label: string
}

export type StoryPayload = {
  mood: StoryMood
  /**
   * Story başlığı. '\n' satır kırar (en fazla iki satır); sondaki emoji
   * serbesttir. Yazı başlığının kopyası DEĞİL, kancasıdır: "elinle ölç,
   * dengele" gibi.
   */
  hook: string
  /** Hook içinde vurgulanacak parça; hook'ta birebir geçmek zorundadır. */
  accent: string
  /** Alt cümle: tek nefeste okunan vaat. */
  sub: string
  /** 3-5 disk. */
  chips: StoryChip[]
}

const MOODS: StoryMood[] = ['emerald', 'cream']

/** Hook satır başına sığan en uzun metin (106px, 900 ağırlık, 900px alan). */
const HOOK_LINE_MAX = 18
const HOOK_LINES_MAX = 2
const SUB_MAX = 110
const CHIP_LABEL_MAX = 12
const CHIPS_MIN = 3
const CHIPS_MAX = 5

/**
 * Bilinmeyen girdiyi StoryPayload'a ayrıştırır; uymayan her şeyde null.
 * Sessizce düzeltmez: kırpılmış bir hook ajanın hatasını gizler ve o hata
 * düzeltilmek yerine yayınlanır.
 */
export function parseStoryPayload(input: unknown): StoryPayload | null {
  if (typeof input !== 'object' || input === null) return null
  const o = input as Record<string, unknown>

  const mood = o.mood
  if (typeof mood !== 'string' || !MOODS.includes(mood as StoryMood)) return null

  const hook = typeof o.hook === 'string' ? o.hook.trim() : ''
  if (!hook) return null
  const lines = hook.split('\n').map((l) => l.trim())
  if (lines.length > HOOK_LINES_MAX) return null
  if (lines.some((l) => !l || l.length > HOOK_LINE_MAX)) return null

  const accent = typeof o.accent === 'string' ? o.accent.trim() : ''
  if (!accent || !hook.includes(accent)) return null

  const sub = typeof o.sub === 'string' ? o.sub.trim() : ''
  if (!sub || sub.length > SUB_MAX) return null

  if (!Array.isArray(o.chips)) return null
  if (o.chips.length < CHIPS_MIN || o.chips.length > CHIPS_MAX) return null
  const chips: StoryChip[] = []
  for (const raw of o.chips) {
    if (typeof raw !== 'object' || raw === null) return null
    const c = raw as Record<string, unknown>
    const emoji = typeof c.emoji === 'string' ? c.emoji.trim() : ''
    const label = typeof c.label === 'string' ? c.label.trim() : ''
    if (!emoji || !label || label.length > CHIP_LABEL_MAX) return null
    chips.push({ emoji, label })
  }

  return { mood: mood as StoryMood, hook: lines.join('\n'), accent, sub, chips }
}

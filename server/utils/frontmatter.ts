/**
 * Repoda yaşayan markdown içeriğinin frontmatter sözleşmesi - destek merkezi
 * (`content/destek/**`), sürüm notları (`content/yenilikler/**`) ve blogun
 * yayınlama script'i (`scripts/publish-post.mjs`) AYNI biçimi kullanır:
 * `---` blokları içinde düz `anahtar: değer` satırları.
 *
 * YAML ayrıştırıcısı bilinçli olarak yok: bağımlılık eklemeden okunabilen bu
 * dar biçim, üç yerde de yeterli olmaya devam ediyor. Biçim genişleyecekse
 * script'teki karşılığı ile birlikte genişler.
 */

export type Frontmatter = Record<string, string>

export function parseFrontmatter(raw: string): { fm: Frontmatter; body: string } | null {
  if (!raw.startsWith('---')) return null
  const end = raw.indexOf('\n---', 3)
  if (end === -1) return null

  const head = raw.slice(raw.indexOf('\n') + 1, end)
  const body = raw.slice(raw.indexOf('\n', end + 1) + 1).trim()

  const fm: Frontmatter = {}
  for (const line of head.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const i = line.indexOf(':')
    if (i === -1) continue
    const key = line.slice(0, i).trim()
    let value = line.slice(i + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    fm[key] = value
  }
  return { fm, body }
}

/** `[a, b, c]` ya da `a, b, c` biçimini diziye çevirir. */
export function toList(value: string | undefined): string[] {
  return (value ?? '')
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((part) => part.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

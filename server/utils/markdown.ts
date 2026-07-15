import MarkdownIt from 'markdown-it'

/**
 * Blog gövdesi render'ı. `html: false` KRİTİK: markdown içindeki ham HTML
 * escape edilir, çıktı v-html ile basılsa da script/iframe enjeksiyonu
 * imkânsızdır — sanitizer bağımlılığına gerek kalmaz. html: true'ya çevirme.
 */
const md = new MarkdownIt({ html: false, linkify: true, typographer: false })

export function renderMarkdown(src: string): string {
  return md.render(src)
}

/** Kaba okuma süresi: ~200 kelime/dk, en az 1 dk. */
export function readingMinutes(src: string): number {
  const words = src.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

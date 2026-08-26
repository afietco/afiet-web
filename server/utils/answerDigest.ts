/**
 * Cevap özeti: bir gövdenin başındaki DOĞRUDAN CEVABI çıkarır.
 *
 * llms-full.txt bunun üzerine kurulu. 26 Ağustos 2026'ya kadar o dosya destek
 * merkezinin tam metniydi (200 KB) ve 14 günde sıfır istek aldı; blog ile
 * hesaplama araçlarını da hiç taşımıyordu. Yeni sözleşme: her madde bir soru,
 * doğrudan cevabı ve kanonik adresi. Tam gövdeyi isteyen adresi çeker.
 *
 * Bu, içerik hattının "cevap önce" kuralının (ajan talimatları,
 * `afiet-backend/tools/content-agents/`) makine tarafındaki karşılığıdır:
 * yazının ilk iki cümlesi başlıktaki sorunun cevabıysa, buradan çıkan özet de
 * kendi başına doğru ve tam olur. Kural bozulursa özet de bozulur, yani bu
 * dosya aynı zamanda kuralın sessiz denetçisidir.
 */

/** Markdown işaretlerinden arınmış düz gövde. */
export function mdPlain(source: string): string {
  return source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Etiketlerden arınmış düz gövde; hesaplama araçları HTML olarak duruyor. */
export function htmlPlain(source: string): string {
  return source
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * İlk cümleleri döndürür. Cümle sonu için noktadan SONRA boşluk aranır, bu
 * yüzden Türkçedeki binlik ayracı ("2.000 besin") cümleyi bölmez.
 *
 * En az iki cümle alınır: "cevap önce" kuralının sözleşmesi ilk İKİ cümledir.
 * Toplam `min` altında kalırsa bir cümle daha alınır ("Kısa cevap: evet." tek
 * başına cevap değildir), `max` aşılacaksa cümle hiç alınmaz, yani çıktı her
 * zaman tam cümlelerden oluşur.
 */
export function answerOpening(plain: string, { min = 120, max = 400 } = {}): string {
  if (!plain) return ''
  const parts = plain.split(/([.!?])\s+/)
  const sentences: string[] = []
  for (let i = 0; i < parts.length; i += 2) {
    const body = parts[i]
    if (!body) continue
    sentences.push(body + (parts[i + 1] ?? ''))
  }
  if (!sentences.length) return plain.slice(0, max)

  let out = ''
  let taken = 0
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence}` : sentence
    if (out && next.length > max) break
    out = next
    taken++
    if (taken >= 2 && out.length >= min) break
  }
  // Tek cümle bile max'ı aşıyorsa son tam kelimede kes; yarım kelime bırakma.
  return out.length > max ? out.slice(0, max).replace(/\s+\S*$/, '') : out
}

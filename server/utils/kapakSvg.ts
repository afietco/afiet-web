/**
 * Kapak görselinin SVG parçaları.
 *
 * Satori CSS filtresi (blur) ve karmaşık düzeni doğrudan çizemez; çizim bu
 * yüzden tek bir SVG olarak kurulup `<img>` içinde data URI ile basılıyor.
 *
 * Sahne kuralı marka şablonlarından alındı (`afiet-brand/social/templates/
 * blog-diyet-yapmadan.html`): Afi beyaz bir disk içinde durur, altında beş
 * besin grubu renginden "denge imzası" sırası vardır. Disk 400, figür 336;
 * bu oran şablonlarda sabittir ve bozulursa figür diskten taşar.
 */

/** Marka ikonu (public/icon.svg ile aynı çizim, kapak boyutuna sadeleşmiş). */
export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="112" height="112">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#10b981"/><stop offset="1" stop-color="#047857"/></linearGradient></defs>
<rect width="512" height="512" rx="116" fill="url(#g)"/>
<g transform="translate(256 288) scale(1.07) translate(-256 -288)">
<path d="M207 232c0-19 17-23 17-42s-17-21-17-40" fill="none" stroke="#a7f3d0" stroke-width="21" stroke-linecap="round"/>
<path d="M300 238c0-21 19-25 19-48s-19-23-19-46" fill="none" stroke="#fff" stroke-width="23" stroke-linecap="round"/>
<path d="M116 276h280a140 108 0 0 1-280 0z" fill="#fff"/>
<g fill="none" stroke="#047857" stroke-linecap="round">
<path d="M180 316q23-21 46 0" stroke-width="15"/><path d="M286 316q23-21 46 0" stroke-width="15"/>
<path d="M238 342q18 14 36 0" stroke-width="13"/></g>
<rect x="210" y="394" width="92" height="20" rx="10" fill="#fff"/></g></svg>`

/**
 * Kullanılabilir Afi pozları. Dosyalar afiet-brand'den KOPYALANDI, yeniden
 * çizilmedi: maskotun tek kaynağı orasıdır ve buhar telleri, yüz ifadesi gibi
 * kuralları taşır (BRAND.md > Logo). Poz yazının konusuna göre seçilir.
 */
export const POSES = {
  temel: 'Afi olduğu gibi duruyor',
  su: 'Afi elinde bardakla',
  kasik: 'Afi kaşığıyla',
  merak: 'Afi merak ediyor',
  selam: 'Afi selam veriyor',
  kutlama: 'Afi kutluyor',
} as const
export type PoseKey = keyof typeof POSES

/** Beş besin grubunun uygulamadaki renkleri; sıra da uygulamadaki sıradır. */
const GRUP_RENKLERI = ['#10b981', '#fbbf24', '#fb923c', '#fb7185', '#38bdf8']

/**
 * Maskot çizimini disk ve denge imzasıyla birlikte tek SVG'ye kurar.
 *
 * Poz dosyası dıştaki `<svg>` etiketiyle geliyor; iç içe SVG olarak
 * yerleştirmek için o etikete konum ve boyut veriliyor, gövdesine
 * dokunulmuyor. Böylece marka dosyası güncellenince kapak da güncellenir.
 */
export function sahneSvg(poseSvg: string): string {
  const inner = poseSvg
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<svg[^>]*>/, '<svg x="52" y="16" width="336" height="336" viewBox="0 0 512 512">')

  const dots = GRUP_RENKLERI.map(
    (c, i) => `<circle cx="${157 + i * 27}" cy="404" r="7" fill="${c}"/>`,
  ).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 440" width="430" height="430">
<circle cx="220" cy="196" r="196" fill="#ffffff" stroke="#ece4d4" stroke-width="2"/>
${inner}
${dots}
</svg>`
}

/**
 * Satori `<img>` yalnız data URI okur ve URI'yi btoa ile çözer; btoa Latin-1
 * dışını kabul etmediği için çizimdeki Türkçe harfler ham utf8 gömmede
 * "Invalid character" veriyordu. UTF-8'i önce base64'e çevirmek bunu çözer.
 */
export const dataUri = (svg: string) => `data:image/svg+xml;base64,${utf8ToBase64(svg.replace(/\n/g, ''))}`

/**
 * UTF-8 metni base64'e çevirir. `Buffer` KULLANILMAZ: repoda bilinçli olarak
 * `@types/node` yok (gcsSign.ts da bu yüzden Web Crypto ile imzalıyor).
 */
function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

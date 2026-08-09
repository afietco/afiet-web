/**
 * Kapak görselinin SVG parçaları.
 *
 * Satori CSS filtresi (blur) ve karmaşık SVG'yi doğrudan çizemez; bu yüzden
 * marka şablonundaki (`afiet-brand/social/templates/blog-*.html`) çizimler
 * buraya SVG olarak taşındı ve `<img>` içinde data URI olarak basılıyor.
 * Renkler ve oranlar o şablonlarla BİREBİR aynıdır: beş besin grubu rengi
 * uygulamadaki renklerdir, sebze her zaman en büyük kaptır.
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
 * Sofra motifi: beyaz sini üstünde beş besin grubu.
 *
 * P2 hub kapağının çizimi. Oran anlamlıdır: sebze merkezde ve en büyüktür,
 * yazının tezi ne olursa olsun bu oran değişmez (marka doktrini).
 */
const SOFRA = `
<ellipse cx="236" cy="482" rx="132" ry="13" fill="#022c22" opacity=".07"/>
<circle cx="236" cy="268" r="196" fill="#ffffff" stroke="#ece4d4" stroke-width="5"/>
<g stroke="#ffffff" stroke-width="7">
<circle cx="236" cy="268" r="78" fill="#10b981"/>
<circle cx="236" cy="132" r="52" fill="#fbbf24"/>
<circle cx="368" cy="250" r="50" fill="#fb923c"/>
<circle cx="250" cy="400" r="48" fill="#fb7185"/>
<circle cx="108" cy="290" r="46" fill="#38bdf8"/></g>
<g font-family="Nunito" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-.5">
<text x="236" y="281" font-size="34">sebze</text><text x="236" y="142" font-size="24">tahıl</text>
<text x="368" y="258" font-size="20">protein</text><text x="250" y="409" font-size="22">meyve</text>
<text x="108" y="300" font-size="23">süt</text></g>`

/**
 * Tabak motifi: tek tabak, oranlar dilim olarak. P1 hub kapağının dili;
 * "tek öğün" anlatan yazılarda sofra motifinden daha doğru.
 */
const TABAK = `
<ellipse cx="236" cy="482" rx="132" ry="13" fill="#022c22" opacity=".07"/>
<circle cx="236" cy="268" r="196" fill="#ffffff" stroke="#ece4d4" stroke-width="5"/>
<g stroke="#ffffff" stroke-width="6">
<path d="M236 268 L236 96 A172 172 0 0 1 236 440 Z" fill="#10b981"/>
<path d="M236 268 L236 440 A172 172 0 0 1 114 390 Z" fill="#fbbf24"/>
<path d="M236 268 L114 390 A172 172 0 0 1 96 200 Z" fill="#fb923c"/>
<path d="M236 268 L96 200 A172 172 0 0 1 236 96 Z" fill="#38bdf8"/></g>
<circle cx="236" cy="268" r="46" fill="#ffffff"/>
<g font-family="Nunito" font-weight="900" fill="#ffffff" text-anchor="middle">
<text x="348" y="278" font-size="30">sebze</text><text x="196" y="386" font-size="22">tahıl</text>
<text x="146" y="286" font-size="20">protein</text><text x="196" y="176" font-size="20">süt</text></g>`

/**
 * Ölçü motifi: el ölçüsü rehberlerinin dili. Renkler yine besin gruplarıdır,
 * terminoloji yayındaki yazılarla sabit: avuç içi protein, yumruk sebze.
 */
const OLCU = `
<ellipse cx="236" cy="482" rx="132" ry="13" fill="#022c22" opacity=".07"/>
<circle cx="236" cy="268" r="196" fill="#ffffff" stroke="#ece4d4" stroke-width="5"/>
<g stroke="#ffffff" stroke-width="7">
<circle cx="160" cy="196" r="66" fill="#10b981"/><circle cx="312" cy="196" r="60" fill="#fb923c"/>
<circle cx="160" cy="342" r="58" fill="#fbbf24"/><circle cx="312" cy="342" r="52" fill="#38bdf8"/></g>
<g font-family="Nunito" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-.5">
<text x="160" y="190" font-size="26">yumruk</text><text x="160" y="220" font-size="19">sebze</text>
<text x="312" y="190" font-size="24">avuç içi</text><text x="312" y="219" font-size="18">protein</text>
<text x="160" y="336" font-size="22">kapalı</text><text x="160" y="362" font-size="18">tahıl</text>
<text x="312" y="338" font-size="18">başparmak</text><text x="312" y="362" font-size="17">yağ</text></g>`

export const MOTIFS = { sofra: SOFRA, tabak: TABAK, olcu: OLCU }
export type MotifKey = keyof typeof MOTIFS

export function motifSvg(key: MotifKey): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="430" height="430">${MOTIFS[key]}</svg>`
}

/**
 * Satori `<img>` yalnız data URI okur ve URI'yi btoa ile çözer; btoa Latin-1
 * dışını kabul etmediği için çizimdeki Türkçe harfler ("tahıl", "süt",
 * "başparmak") ham utf8 gömmede "Invalid character" veriyordu. UTF-8'i önce
 * base64'e çevirmek bunu tamamen çözer.
 */
export const dataUri = (svg: string) => `data:image/svg+xml;base64,${utf8ToBase64(svg.replace(/\n/g, ''))}`

/**
 * UTF-8 metni base64'e çevirir. `Buffer` KULLANILMAZ: repoda bilinçli olarak
 * `@types/node` yok (gcsSign.ts da bu yüzden Web Crypto ile imzalıyor).
 * Bayta tek tek çevirip parça parça birleştiriyoruz; tek seferde spread etmek
 * büyük çizimlerde çağrı yığınını taşırır.
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

/**
 * jpeg-js ve upng-js tip bildirimleri. İki paket de saf JS'tir ve tip
 * yayınlamaz; repoda bilinçli olarak @types/node yok (gcsSign.ts ile aynı
 * gerekçe), bu yüzden kullandığımız dar yüzeyi burada kendimiz bildiririz.
 */
declare module 'jpeg-js' {
  export function encode(
    img: { data: Uint8Array; width: number; height: number },
    quality?: number,
  ): { data: Uint8Array; width: number; height: number }
}

declare module 'upng-js' {
  interface UpngImage {
    width: number
    height: number
  }
  function decode(buffer: ArrayBuffer): UpngImage
  function toRGBA8(img: UpngImage): ArrayBuffer[]
  export default { decode, toRGBA8 }
}

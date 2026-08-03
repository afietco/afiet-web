/**
 * Sürüm kapısı: mobil uygulamanın açılışta okuduğu iki eşik.
 *
 * Mobil taraftaki karşılığı `@afiet/core`'daki `AppVersionGate`; iki şeklin
 * ALANLARI birebir aynı olmalı, uygulama bu gövdeyi olduğu gibi diske yazıp
 * kararı ondan veriyor.
 */

export interface PlatformVersionGate {
  /** Mağazadaki en yeni sürüm. Bunun altındaki sürüme atlanabilir kart çıkar. */
  latestVersion: string | null
  /** Bu sürümün altındaki uygulama çalışmayı reddeder. Pahalı bir kol. */
  minimumVersion: string | null
  /** "Mağazaya git" nereye gitsin. Boşsa uygulama bildiği adrese düşer. */
  storeUrl: string | null
  /** Zorunlu güncellemenin sebebini anlatan tek satır (markanın diliyle). */
  message: string | null
}

export interface AppVersionGate {
  ios: PlatformVersionGate
  android: PlatformVersionGate
}

export type AppVersionPlatform = keyof AppVersionGate

export const APP_VERSION_PLATFORMS: AppVersionPlatform[] = ['ios', 'android']

/** Hiçbir şey ayarlanmamış hali: kapı yok. DB boşken dönen cevap budur. */
export function emptyPlatformGate(): PlatformVersionGate {
  return { latestVersion: null, minimumVersion: null, storeUrl: null, message: null }
}

export function emptyAppVersionGate(): AppVersionGate {
  return { ios: emptyPlatformGate(), android: emptyPlatformGate() }
}

/**
 * Nokta ayrılmış sayı dizisi: "0.10.0", "1.2". Boş ya da tanınmayan her şey
 * null döner ve null "ayarlanmamış" demektir; hiçbir yerde kapıya dönüşmez.
 */
export function normalizeVersion(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim().replace(/^v/i, '')
  if (trimmed === '') return null
  if (!/^\d+(\.\d+)*$/.test(trimmed)) return null
  return trimmed
}

/**
 * Segment segment karşılaştırır. Metin sıralaması 0.9'u 0.10'dan büyük
 * sayardı; sürüm numarasında kırılan tam olarak budur.
 */
export function compareAppVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i += 1) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0)
    if (difference !== 0) return difference < 0 ? -1 : 1
  }
  return 0
}

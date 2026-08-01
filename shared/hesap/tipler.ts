/**
 * Hesap motorunun tip ve sabitleri.
 *
 * KAYNAK: afiet-mobile `packages/core/src/types.ts`. Bu dosya o kaynağın
 * AYNASIDIR; buradaki değerler uygulamanınkiyle birebir aynı olmak zorunda,
 * yoksa sitede gördüğü sayıyla uygulamada gördüğü sayı tutmaz.
 * Sapmayı `shared/hesap/motor.test.ts` yakalar (gerçek çekirdekten üretilmiş
 * fikstüre karşı çalışır). Yeniden eşitleme yordamı `motor.ts` başlığında.
 */

export type Sex = 'kadin' | 'erkek'

export type ActivityLevel = 'hareketsiz' | 'az' | 'orta' | 'aktif' | 'cok_aktif'

export type GoalDirection = 'hafifle' | 'donusum' | 'koru' | 'duzen'

export const ACTIVITY_LEVELS: {
  key: ActivityLevel
  label: string
  description: string
  multiplier: number
}[] = [
  { key: 'hareketsiz', label: 'Masa başı', description: 'Günün çoğu oturarak geçiyor', multiplier: 1.2 },
  { key: 'az', label: 'Hafif hareketli', description: 'Gün içinde ara sıra hareket ediyorum', multiplier: 1.375 },
  { key: 'orta', label: 'Hareketli', description: 'Günün önemli bir bölümünde ayaktayım', multiplier: 1.55 },
  { key: 'aktif', label: 'Çok hareketli', description: 'Gün boyu sık sık hareket ediyorum', multiplier: 1.725 },
  { key: 'cok_aktif', label: 'Fiziksel tempo', description: 'İşim veya günlük rutinim fiziksel olarak yoğun', multiplier: 1.9 },
]

export function activityMeta(key: ActivityLevel) {
  return ACTIVITY_LEVELS.find((a) => a.key === key)!
}

export const SEXES: { key: Sex; label: string }[] = [
  { key: 'kadin', label: 'Kadın' },
  { key: 'erkek', label: 'Erkek' },
]

/**
 * Ölçü ve besin grubu etiketleri. KAYNAK: `packages/core/src/types.ts`
 * (FOOD_MEASURES ve FOOD_GROUPS). Porsiyon çevirici bunları okur; katalog
 * dizini yalnız anahtarları taşır, etiket burada durur.
 */
export const OLCU_ETIKET: Record<string, string> = {
  adet: 'adet',
  dilim: 'dilim',
  kase: 'kase',
  kasik: 'kaşık',
  bardak: 'bardak',
  fincan: 'fincan',
  avuc: 'avuç',
  porsiyon: 'porsiyon',
  gram: 'g',
}

/** İlk beşi denge halkasında sayılan temel gruplardır. */
export const BESIN_GRUBU: { key: string; label: string; temel: boolean }[] = [
  { key: 'sebze', label: 'Sebze', temel: true },
  { key: 'meyve', label: 'Meyve', temel: true },
  { key: 'protein', label: 'Protein', temel: true },
  { key: 'tahil', label: 'Tahıl', temel: true },
  { key: 'sut', label: 'Süt Ürünü', temel: true },
  { key: 'bakliyat', label: 'Bakliyat', temel: false },
  { key: 'yag', label: 'Sağlıklı Yağ', temel: false },
  { key: 'kuruyemis', label: 'Kuruyemiş', temel: false },
  { key: 'hamurisi', label: 'Hamur İşi', temel: false },
  { key: 'icecek', label: 'İçecek', temel: false },
  { key: 'tatli', label: 'Tatlı/Şekerli', temel: false },
  { key: 'fastfood', label: 'Fast Food', temel: false },
]

export const grupEtiket = (key: string) =>
  BESIN_GRUBU.find((g) => g.key === key)?.label ?? key

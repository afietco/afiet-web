/**
 * Sürüm notlarının veri tipleri - SUNUCU VE İSTEMCİ İÇİN TEK KAYNAK.
 * Sunucu bunları üretir (server/utils/releaseStore.ts), `/yenilikler`
 * sayfaları tüketir.
 *
 * Kaynak dosyalar `content/yenilikler/<sürüm>.md`; uygulamanın kendi
 * changelog'undan (`afiet-mobile/apps/mobile/CHANGELOG.md`) türetilir,
 * bkz. `scripts/surum-notu-taslagi.mjs`.
 */

/** Bir sürüm başlığının altındaki madde sayısı; listede rozet olarak çıkar. */
export type ReleaseSection = {
  /** "Yenilikler", "İyileştirmeler", "Düzeltmeler"… */
  heading: string
  count: number
}

/** Sürümün liste görünümü (gövdesiz). */
export type ReleaseSummary = {
  /** Uygulamanın sürüm numarası; aynı zamanda URL parçası (0.10.0). */
  version: string
  /** Yayın tarihi, yerel YYYY-MM-DD. */
  date: string
  /** Sürümü tek cümlede anlatan başlık. */
  title: string
  /** Listede ve meta açıklamasında görünen iki cümle. */
  summary: string
  sections: ReleaseSection[]
  /** Tüm bölümlerdeki madde toplamı. */
  total: number
}

/** Sürüm sayfasının ihtiyacı olan her şey. */
export type ReleaseNote = ReleaseSummary & {
  html: string
  /** Zaman sırasında komşular; sayfa altındaki gezinme bunları okur. */
  newer: ReleaseSummary | null
  older: ReleaseSummary | null
}

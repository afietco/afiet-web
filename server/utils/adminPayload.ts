import type { H3Event } from 'h3'
import { getSeoBundle, hasDb, loadOverrides, seoDefaultsForAdmin } from './seoStore'

/**
 * Panelin tek seferde ihtiyaç duyduğu her şey: ham override'lar (neyin
 * değiştirildiğini bilmek için), kod varsayılanları, efektif birleşim,
 * bot kataloğu ve DB durumu. Yazan uçlar da bunu döndürür — panel tek
 * yanıtla tazelenir.
 */
export async function buildAdminPayload(event: H3Event) {
  const [overrides, effective] = await Promise.all([loadOverrides(event), getSeoBundle(event)])
  const defaults = seoDefaultsForAdmin()
  return {
    dbConnected: hasDb(event),
    overrides: {
      settings: overrides.settings,
      pages: overrides.pages,
      redirects: overrides.redirects,
    },
    updatedAt: overrides.updatedAt ?? {},
    effective,
    defaults,
  }
}

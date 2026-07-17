/**
 * Stack Auth istemci REST yardımcıları. Mobil uygulamanın auth sağlayıcısı
 * Stack Auth, şifre sıfırlama ve e-posta doğrulama e-postalarındaki
 * bağlantıları bu sitedeki /sifre-yenile/{env} ve /e-posta-dogrula/{env}
 * sayfalarına indirir; sayfalar ?code= parametresini tarayıcıdan doğrudan
 * Stack Auth REST API'sine iletir (CORS açık, proje id'leri public).
 */

const API_BASE = 'https://api.stack-auth.com/api/v1'

/** URL'deki ortam segmenti (dev|staging|prod) -> Stack Auth proje id'si. */
export const STACK_PROJECT_IDS: Record<string, string> = {
  dev: 'df8401ea-a019-4316-9cbd-4192a5ab22a0',
  staging: '4aefb05e-eecb-4fb4-931f-dd28cdcd5171',
  prod: '474c5335-1b01-446e-962d-5eac1786e293',
}

export type StackAuthResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; code: string }

/**
 * Gövdeli POST atar; başarıda yanıt gövdesini, hatada Stack Auth hata
 * `code`unu döndürür (ağ hatası vb. durumlarda code boş string).
 * Hata gövdesindeki ham `error` metni bilinçli olarak dışarı verilmez:
 * İngilizcedir ve kişisel veri içerebilir. Kullanıcıya gösterilecek
 * Türkçe mesajı, code'a bakarak sayfa seçer.
 */
export async function stackAuthPost(
  projectId: string,
  path: string,
  body: Record<string, unknown>,
): Promise<StackAuthResult> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'X-Stack-Access-Type': 'client',
        'X-Stack-Project-Id': projectId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data: Record<string, unknown> = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, code: typeof data.code === 'string' ? data.code : '' }
    }
    return { ok: true, data }
  } catch {
    return { ok: false, code: '' }
  }
}

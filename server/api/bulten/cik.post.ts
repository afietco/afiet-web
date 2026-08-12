import { bultenSql, unsubscribeByToken } from '~~/server/utils/bultenStore'

/**
 * Tek tık çıkış. Token'ı bilen çıkar; ek doğrulama sorulmaz (fikrini
 * değiştirenin önüne ikinci kapı koymak kayıp draması olur).
 *
 * Token gövdeden (sayfanın çağrısı) YA DA query'den okunur: bülten maillerinin
 * `List-Unsubscribe` başlığı `/api/bulten/cik?token=...` adresini taşır ve
 * posta istemcileri oraya gövdesiz POST atar (RFC 8058 one-click).
 */
export default defineEventHandler(async (event): Promise<{ status: string }> => {
  const body = await readBody(event).catch(() => ({}) as Record<string, unknown>)
  const token =
    String(body?.token ?? '').trim() || String(getQuery(event).token ?? '').trim()
  if (!token || token.length > 80) return { status: 'gecersiz' }

  const sql = bultenSql(event)
  if (!sql) return { status: 'soon' }

  const ok = await unsubscribeByToken(sql, token)
  return { status: ok ? 'unsubscribed' : 'gecersiz' }
})

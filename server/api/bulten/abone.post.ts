import { bultenSql, upsertSubscriber } from '~~/server/utils/bultenStore'

/**
 * Bülten kaydının ilk yarısı: `beklemede` satır + onay maili. Abonelik ancak
 * onay bağlantısıyla başlar (çift onay); yani buradan dönen "ok" henüz
 * abonelik değildir. DB yoksa beta formundaki sözleşmenin aynısı: 503 'soon'.
 *
 * Resend anahtarı yoksa (yerel geliştirme) kayıt yine açılır ama mail
 * gidemez; onay bağlantısı geliştirici için sunucu loguna yazılır.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function sendConfirmMail(apiKey: string, email: string, confirmUrl: string): Promise<void> {
  await $fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: {
      from: 'afiet <bulten@posta.afiet.co>',
      to: [email],
      subject: 'Sofraya bir adım kaldı: aboneliğini onayla',
      text: [
        'Merhaba,',
        '',
        'afiet bültenine abone olmak istediğini aldık. Seni listeye eklememiz',
        'için tek bir adım kaldı: aşağıdaki bağlantıya dokunman yeter.',
        '',
        confirmUrl,
        '',
        'Bu isteği sen yapmadıysan bu maili görmezden gelebilirsin; hiçbir',
        'şey gönderilmez.',
        '',
        'Sofrana afiyet.',
        'afiet · Sayma, dengele.',
      ].join('\n'),
    },
  })
}

export default defineEventHandler(async (event): Promise<{ status: string }> => {
  const body = await readBody(event).catch(() => ({}) as Record<string, unknown>)

  // Honeypot: insanlar görmez. Dolduran bota "başarılı" deriz, kayıt açılmaz.
  if (String(body?.company ?? '') !== '') return { status: 'ok' }

  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 254)
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_eposta' })
  }
  const source = String(body?.source ?? '')
    .trim()
    .slice(0, 40)

  const sql = bultenSql(event)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'soon' })

  const sub = await upsertSubscriber(sql, email, source)

  // Zaten onaylı aboneye onay maili yeniden gitmez; form yine "ok" görür.
  if (sub.status === 'onayli') return { status: 'ok' }

  const confirmUrl = `${getRequestURL(event).origin}/bulten/onay?token=${sub.token}`
  const apiKey = String(useRuntimeConfig(event).resendApiKey || '')
  if (!apiKey) {
    console.warn('[bulten] RESEND anahtarı yok; onay bağlantısı:', confirmUrl)
    return { status: 'ok' }
  }

  try {
    await sendConfirmMail(apiKey, email, confirmUrl)
  } catch (err) {
    // Mail düşerse kayıt durur; kullanıcıya dürüst bir hata döneriz ki
    // "onay yolda" deyip hiç gelmeyen bir maili bekletmeyelim.
    console.error('[bulten] onay maili gönderilemedi:', err)
    throw createError({ statusCode: 502, statusMessage: 'mail_gonderilemedi' })
  }

  return { status: 'ok' }
})

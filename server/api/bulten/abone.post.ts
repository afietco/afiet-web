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

/** Onay maili abonenin dilinde gider; kayıt lang='en' ise metin İngilizcedir. */
async function sendConfirmMail(
  apiKey: string,
  email: string,
  confirmUrl: string,
  lang: 'tr' | 'en',
): Promise<void> {
  const en = lang === 'en'
  await $fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: {
      from: 'afiet <bulten@posta.afiet.co>',
      to: [email],
      subject: en
        ? 'One step to the table: confirm your subscription'
        : 'Sofraya bir adım kaldı: aboneliğini onayla',
      text: en
        ? [
            'Hello,',
            '',
            'We received your request to subscribe to the afiet newsletter.',
            'There is one step left to add you to the list: just tap the link below.',
            '',
            confirmUrl,
            '',
            'If this was not you, you can ignore this email; nothing will be sent.',
            '',
            'Enjoy your table.',
            'afiet · Stop counting. Start balancing.',
          ].join('\n')
        : [
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
  // Yalnız bilinen değer kabul edilir; ne gelirse gelsin 'en' değilse 'tr'.
  const lang: 'tr' | 'en' = body?.lang === 'en' ? 'en' : 'tr'

  const sql = bultenSql(event)
  if (!sql) throw createError({ statusCode: 503, statusMessage: 'soon' })

  const sub = await upsertSubscriber(sql, email, source, lang)

  // Zaten onaylı aboneye onay maili yeniden gitmez; form yine "ok" görür.
  if (sub.status === 'onayli') return { status: 'ok' }

  const confirmPath = lang === 'en' ? '/en/newsletter/confirm' : '/bulten/onay'
  const confirmUrl = `${getRequestURL(event).origin}${confirmPath}?token=${sub.token}`
  const apiKey = String(useRuntimeConfig(event).resendApiKey || '')
  if (!apiKey) {
    console.warn('[bulten] RESEND anahtarı yok; onay bağlantısı:', confirmUrl)
    return { status: 'ok' }
  }

  try {
    await sendConfirmMail(apiKey, email, confirmUrl, lang)
  } catch (err) {
    // Mail düşerse kayıt durur; kullanıcıya dürüst bir hata döneriz ki
    // "onay yolda" deyip hiç gelmeyen bir maili bekletmeyelim.
    console.error('[bulten] onay maili gönderilemedi:', err)
    throw createError({ statusCode: 502, statusMessage: 'mail_gonderilemedi' })
  }

  return { status: 'ok' }
})

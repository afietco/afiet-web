/**
 * Kartpostal ucu (/iletisim formu). Mesaj veritabanına YAZILMAZ; tek işi
 * ekip posta kutusuna düşmektir (kullanıcı kararı, 5 Ağu 2026): Resend ile
 * beta bildirimleriyle aynı alıcılara gider, reply_to gönderen olur ki
 * cevap doğrudan yazışmaya dönsün. Anahtar yoksa 503: çalışmayan form
 * yayınlanmaz (beta formu sözleşmesinin aynısı).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Pul anahtarı → mail konusu etiketi. Bilinmeyen değer 'genel'e düşer. */
const TOPICS: Record<string, string> = {
  oneri: 'öneri',
  soru: 'soru',
  sorun: 'sorun',
  isbirligi: 'iş birliği',
}

export default defineEventHandler(async (event): Promise<{ status: string }> => {
  const body = await readBody(event).catch(() => ({}) as Record<string, unknown>)

  // Honeypot: dolduran bota "başarılı" deriz, mail gitmez.
  if (String(body?.company ?? '') !== '') return { status: 'ok' }

  const email = String(body?.email ?? '')
    .trim()
    .toLowerCase()
    .slice(0, 254)
  const message = String(body?.message ?? '')
    .trim()
    .slice(0, 4000)
  const name = String(body?.name ?? '')
    .trim()
    .slice(0, 120)
  const topicKey = String(body?.topic ?? '')
  const topic = TOPICS[topicKey] ?? ''

  if (!message) throw createError({ statusCode: 422, statusMessage: 'mesaj_bos' })
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 422, statusMessage: 'gecersiz_eposta' })
  }

  const apiKey = String(useRuntimeConfig(event).resendApiKey || '')
  if (!apiKey) throw createError({ statusCode: 503, statusMessage: 'soon' })

  const subject = topic ? `Kartpostal: ${topic}` : 'Kartpostal'
  const text = [
    name ? `Kimden: ${name}` : '',
    `E-posta: ${email}`,
    topic ? `Konu: ${topic}` : '',
    '',
    message,
  ]
    .filter((line, i) => line !== '' || i === 3) // yalnız gövde öncesi boş satır kalsın
    .join('\n')

  try {
    await $fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        from: 'afiet kartpostal <bildirim@posta.afiet.co>',
        to: ['berk@afiet.co', 'rberkkaratas@gmail.com'],
        reply_to: email,
        subject,
        text,
      },
    })
  } catch (err) {
    console.error('[iletisim] kartpostal maili gönderilemedi:', err)
    throw createError({ statusCode: 502, statusMessage: 'mail_gonderilemedi' })
  }

  return { status: 'ok' }
})

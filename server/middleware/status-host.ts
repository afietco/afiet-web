/**
 * status.afiet.co bu Vercel projesine bağlıdır; tek kanonik adres
 * afiet.co/durum olsun diye alt alan kalıcı yönlendirilir. Böylece durum
 * sayfası çift URL'den servis edilip SEO'da kopya içerik üretmez.
 */
export default defineEventHandler((event) => {
  const host = getHeader(event, 'host') ?? ''
  if (host === 'status.afiet.co') {
    return sendRedirect(event, 'https://afiet.co/durum', 308)
  }
})

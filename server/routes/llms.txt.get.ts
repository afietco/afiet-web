import { getSeoBundle } from '~~/server/utils/seoStore'

/** llms.txt (llmstxt.org) — içerik panelden düzenlenir, kapatılırsa 404. */
export default defineEventHandler(async (event) => {
  const { settings } = await getSeoBundle(event)
  if (!settings.llms.enabled) {
    throw createError({ statusCode: 404, statusMessage: 'llms_kapali' })
  }
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return settings.llms.content
})

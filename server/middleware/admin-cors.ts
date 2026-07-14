/**
 * /api/admin/** için CORS: panel (afiet-admin) ayrı origin'den çağırır.
 * İzinli origin'ler env'den (NUXT_ADMIN_CORS_ORIGINS, virgüllü); `nuxt dev`te
 * localhost panel portları otomatik eklenir. Diğer tüm yollar dokunulmaz.
 */
export default defineEventHandler((event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/admin/')) return

  const cfg = useRuntimeConfig(event)
  const allowed = String(cfg.adminCorsOrigins || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
  if (import.meta.dev) {
    allowed.push('http://localhost:5173', 'http://127.0.0.1:5173')
  }

  const origin = getHeader(event, 'origin')
  if (origin && allowed.includes(origin.replace(/\/$/, ''))) {
    setHeader(event, 'Access-Control-Allow-Origin', origin)
    setHeader(event, 'Vary', 'Origin')
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS')
    setHeader(event, 'Access-Control-Allow-Headers', 'Authorization, Content-Type')
    setHeader(event, 'Access-Control-Max-Age', 600)
  }

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})

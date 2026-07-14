import type { SeoRedirect, SettingsKey } from './seoTypes'
import { normalizePath } from './seoStore'

/**
 * Panelden gelen değerleri temizler: bilinen alanlar dışındakiler atılır,
 * tip uymayan alan 422 fırlatır, olmayan alan (kısmi güncelleme) atlanır.
 * Amaç şema polisliği değil; render'a çöp sızmasın yeter.
 */

function fail(field: string): never {
  throw createError({ statusCode: 422, statusMessage: `gecersiz_alan:${field}` })
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function pickStr(src: Record<string, unknown>, out: Record<string, unknown>, key: string, max: number) {
  if (!(key in src)) return
  const v = src[key]
  if (typeof v !== 'string' || v.length > max) fail(key)
  out[key] = v
}

function pickBool(src: Record<string, unknown>, out: Record<string, unknown>, key: string) {
  if (!(key in src)) return
  if (typeof src[key] !== 'boolean') fail(key)
  out[key] = src[key]
}

const sanitizers: Record<SettingsKey, (v: unknown) => Record<string, unknown>> = {
  general(v) {
    if (!isObj(v)) fail('general')
    const out: Record<string, unknown> = {}
    for (const k of ['siteName', 'defaultTitle', 'ogImageAlt', 'twitterSite']) pickStr(v, out, k, 200)
    for (const k of ['baseUrl', 'defaultOgImage']) pickStr(v, out, k, 500)
    pickStr(v, out, 'defaultDescription', 500)
    pickStr(v, out, 'locale', 10)
    pickStr(v, out, 'themeColor', 30)
    if ('baseUrl' in out && !/^https?:\/\/[^\s/]+$/.test(String(out.baseUrl))) fail('baseUrl')
    if ('verification' in v) {
      if (!isObj(v.verification)) fail('verification')
      const ver: Record<string, unknown> = {}
      for (const k of ['google', 'bing', 'yandex']) pickStr(v.verification, ver, k, 200)
      out.verification = ver
    }
    return out
  },
  robots(v) {
    if (!isObj(v)) fail('robots')
    const out: Record<string, unknown> = {}
    pickBool(v, out, 'indexable')
    pickStr(v, out, 'extraRules', 4000)
    if ('aiBots' in v) {
      if (!isObj(v.aiBots)) fail('aiBots')
      const bots: Record<string, boolean> = {}
      for (const [agent, allow] of Object.entries(v.aiBots)) {
        if (typeof allow !== 'boolean' || agent.length > 100 || !/^[\w.-]+$/.test(agent)) fail('aiBots')
        bots[agent] = allow
      }
      out.aiBots = bots
    }
    return out
  },
  llms(v) {
    if (!isObj(v)) fail('llms')
    const out: Record<string, unknown> = {}
    pickBool(v, out, 'enabled')
    pickStr(v, out, 'content', 50_000)
    return out
  },
  schema(v) {
    if (!isObj(v)) fail('schema')
    const out: Record<string, unknown> = {}
    if ('organization' in v) {
      if (!isObj(v.organization)) fail('organization')
      const org: Record<string, unknown> = {}
      pickBool(v.organization, org, 'enabled')
      for (const k of ['name', 'contactEmail']) pickStr(v.organization, org, k, 200)
      for (const k of ['url', 'logo']) pickStr(v.organization, org, k, 500)
      if ('sameAs' in v.organization) {
        const sa = v.organization.sameAs
        if (!Array.isArray(sa) || sa.some((u) => typeof u !== 'string' || u.length > 500)) fail('sameAs')
        org.sameAs = sa
      }
      out.organization = org
    }
    if ('website' in v) {
      if (!isObj(v.website)) fail('website')
      const ws: Record<string, unknown> = {}
      pickBool(v.website, ws, 'enabled')
      out.website = ws
    }
    if ('mobileApp' in v) {
      if (!isObj(v.mobileApp)) fail('mobileApp')
      const app: Record<string, unknown> = {}
      pickBool(v.mobileApp, app, 'enabled')
      for (const k of ['name', 'operatingSystem', 'category']) pickStr(v.mobileApp, app, k, 200)
      pickStr(v.mobileApp, app, 'description', 1000)
      for (const k of ['appStoreUrl', 'playStoreUrl']) pickStr(v.mobileApp, app, k, 500)
      out.mobileApp = app
    }
    return out
  },
  faq(v) {
    if (!isObj(v)) fail('faq')
    const out: Record<string, unknown> = {}
    pickBool(v, out, 'enabled')
    pickBool(v, out, 'showOnLanding')
    pickStr(v, out, 'title', 200)
    pickStr(v, out, 'intro', 500)
    if ('items' in v) {
      if (!Array.isArray(v.items) || v.items.length > 50) fail('items')
      out.items = v.items.map((it) => {
        if (!isObj(it) || typeof it.q !== 'string' || typeof it.a !== 'string') fail('items')
        if (it.q.length > 300 || it.a.length > 3000) fail('items')
        return { q: it.q, a: it.a }
      })
    }
    return out
  },
}

export function sanitizeSettingsValue(key: SettingsKey, value: unknown): Record<string, unknown> {
  return sanitizers[key](value)
}

export function sanitizePageValue(value: unknown): Record<string, unknown> {
  if (!isObj(value)) fail('page')
  const out: Record<string, unknown> = {}
  for (const k of ['title', 'ogTitle']) pickStr(value, out, k, 300)
  for (const k of ['description', 'ogDescription']) pickStr(value, out, k, 600)
  for (const k of ['ogImage', 'canonical']) pickStr(value, out, k, 500)
  pickStr(value, out, 'robots', 100)
  if ('jsonld' in value) {
    if (!Array.isArray(value.jsonld) || value.jsonld.length > 10) fail('jsonld')
    for (const block of value.jsonld) if (!isObj(block)) fail('jsonld')
    // Yeniden serileştirilebilirliği burada garanti et (render'da sürpriz olmasın).
    try {
      JSON.stringify(value.jsonld)
    } catch {
      fail('jsonld')
    }
    out.jsonld = value.jsonld
  }
  if ('sitemap' in value) {
    if (!isObj(value.sitemap)) fail('sitemap')
    const sm: Record<string, unknown> = {}
    pickBool(value.sitemap, sm, 'include')
    if ('changefreq' in value.sitemap) {
      const cf = value.sitemap.changefreq
      const valid = ['', 'always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']
      if (typeof cf !== 'string' || !valid.includes(cf)) fail('changefreq')
      sm.changefreq = cf
    }
    if ('priority' in value.sitemap) {
      const p = value.sitemap.priority
      if (p !== null && (typeof p !== 'number' || p < 0 || p > 1)) fail('priority')
      sm.priority = p
    }
    out.sitemap = sm
  }
  return out
}

export function sanitizeRedirect(value: unknown): SeoRedirect {
  if (!isObj(value)) fail('redirect')
  const from = typeof value.from === 'string' ? normalizePath(value.from) : fail('from')
  const toRaw = typeof value.to === 'string' ? value.to.trim() : fail('to')
  const to = /^https?:\/\//.test(toRaw) ? toRaw : normalizePath(toRaw)
  const code = value.code === 302 ? 302 : 301
  if (from === '/') fail('from') // ana sayfayı yönlendirme — siteyi kilitler
  if (from.startsWith('/api') || from.startsWith('/_nuxt')) fail('from')
  if (from === to) fail('to')
  if (from.length > 500 || to.length > 1000) fail('to')
  return { from, to, code }
}

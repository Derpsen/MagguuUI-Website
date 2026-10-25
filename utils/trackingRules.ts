/**
 * Rules shared by the browser beacon and the server counting endpoints.
 * Pure and dependency-free so both sides (and the unit tests) use one source.
 */

/** Public routes that are counted. Anything else (admin, api, 404s, junk) is ignored. */
export const TRACKED_ROUTES = [
  '/', '/strings', '/addons', '/profiles', '/configurator', '/guide', '/changelog', '/faq', '/about', '/imprint', '/privacy', '/status', '/submit-preset',
] as const

const TRACKED = new Set<string>(TRACKED_ROUTES)

/** Pathname without query/hash/trailing slash, only when it is a known public route. */
export function normalizeTrackedPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 300) return null
  let path = raw.split(/[?#]/)[0] ?? ''
  if (!path.startsWith('/')) return null
  if (path.length > 1) path = path.replace(/\/+$/, '')
  return TRACKED.has(path) ? path : null
}

/** What can be copied, and therefore counted. The server also checks the row is published (community: approved). */
export const COPY_TYPES = ['profile', 'wowup', 'layout', 'community'] as const
export type CopyType = typeof COPY_TYPES[number]

export function parseCopyTarget(type: unknown, id: unknown): { type: CopyType, id: number } | null {
  if (typeof type !== 'string' || !(COPY_TYPES as readonly string[]).includes(type)) return null
  const n = typeof id === 'number' ? id : Number.NaN
  if (!Number.isInteger(n) || n <= 0 || n > 2_000_000_000) return null
  return { type: type as CopyType, id: n }
}

/** Do-Not-Track / Global Privacy Control, from request headers (server) or navigator values (client). */
export function isOptedOut(signals: { dnt?: string | null, gpc?: string | null }): boolean {
  return signals.dnt === '1' || signals.gpc === '1'
}

/** Simple user-agent check for crawlers, monitors and automation. The UA is never stored. */
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|curl|wget|python|java\/|go-http|okhttp|axios|node-fetch|undici|libwww|httpclient|phantom|puppeteer|playwright|selenium|facebookexternalhit|embedly|whatsapp|telegram|discord|slack/i

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.length < 12) return true
  return BOT_UA.test(ua)
}

/**
 * Public HTML and content APIs are SWR-cached for 120s via routeRules
 * (nuxt.config.ts). Admin edits must show up immediately, so successful
 * write requests clear the Nitro route cache (same key prefix init.ts uses).
 */

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Write endpoints whose success can change public pages. */
export function isPublicContentWrite(method: string, path: string): boolean {
  if (!WRITE_METHODS.has(method.toUpperCase())) return false
  const pathname = path.split('?')[0] || ''
  return pathname.startsWith('/api/v1/admin/')
    || pathname.startsWith('/api/v1/sync/')
    || pathname.startsWith('/api/v1/webhooks/')
}

export async function clearPublicRouteCache(): Promise<number> {
  const routeCache = useStorage('cache')
  const keys = await routeCache.getKeys('nitro:routes')
  await Promise.all(keys.map(key => routeCache.removeItem(key)))
  return keys.length
}

/** Browsers revalidate public pages every time (ETag makes unchanged pages a 304). */
export const BROWSER_REVALIDATE_CACHE_CONTROL = 'public, max-age=0, must-revalidate'

/**
 * Nitro's shared-cache headers for `swr` routeRules (`s-maxage=…, stale-while-revalidate`,
 * and `public, max-age=120, s-maxage=120` on its 304s) become a browser revalidate header.
 * Anything else (private/no-store admin headers, static assets) is left alone.
 */
export function browserCacheControl(value: string): string {
  if (/s-maxage/i.test(value) && !/private|no-store/i.test(value)) return BROWSER_REVALIDATE_CACHE_CONTROL
  return value
}

/**
 * Edge (Cloudflare) cache window for public HTML and /api/v1/catalog-summary.
 * Browsers ignore CDN-Cache-Control, so they keep revalidating every visit
 * (BROWSER_REVALIDATE_CACHE_CONTROL). Admin/sync/webhook writes purge the edge
 * via server/utils/cloudflarePurge.ts when the Cloudflare envs are set.
 */
export const CDN_MAX_AGE_SECONDS = 120
export const CDN_STALE_WHILE_REVALIDATE_SECONDS = 600
export const CDN_CACHE_CONTROL = `public, max-age=${CDN_MAX_AGE_SECONDS}, stale-while-revalidate=${CDN_STALE_WHILE_REVALIDATE_SECONDS}`

/** Public, anonymous pages + the homepage summary API that the edge may cache. */
export const CDN_CACHEABLE_PATHS = new Set([
  '/',
  '/guide',
  '/faq',
  '/changelog',
  '/about',
  '/addons',
  '/profiles',
  '/imprint',
  '/privacy',
  '/api/v1/catalog-summary',
])

export function isCdnCacheable(method: string, path: string, status: number): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false
  if (status !== 200) return false
  const [pathname = '', query] = path.split('?')
  // Query strings would split the edge cache key; only the bare URLs are shared.
  if (query) return false
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return CDN_CACHEABLE_PATHS.has(normalized)
}

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

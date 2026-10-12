/**
 * Public pages and content APIs stay SWR-cached on the server (routeRules,
 * 120s), but admin edits must be live on the next request:
 *
 * 1. A successful admin/sync/webhook write clears the Nitro route cache
 *    (beforeResponse, so the cache is empty before the client sees "saved").
 * 2. Browsers must not keep a stale copy. Nitro's SWR headers
 *    (`s-maxage=120, stale-while-revalidate`, and `max-age=120` on its 304s)
 *    let a browser reuse the old page for up to 120s after an edit. Public
 *    GETs tell browsers to revalidate every visit; the ETag keeps unchanged
 *    pages a cheap 304. Server-side SWR caching is unchanged.
 * 3. Revalidation uses the ETag only. Last-Modified has 1-second resolution,
 *    so an edit in the same second as the last render answered 304.
 */
import type { ServerResponse } from 'node:http'
import { clearPublicRouteCache, isPublicContentWrite, browserCacheControl } from '~/server/utils/publicCache'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    if (event.method !== 'GET' && event.method !== 'HEAD') return
    if (event.path.startsWith('/api/v1/admin') || event.path.startsWith('/admin')) return
    delete event.node.req.headers['if-modified-since']

    const res = event.node.res as ServerResponse
    const setHeader = res.setHeader.bind(res)
    res.setHeader = ((name: string, value: number | string | readonly string[]) => {
      const lower = name.toLowerCase()
      if (lower === 'last-modified') return res
      if (lower === 'cache-control' && typeof value === 'string') return setHeader(name, browserCacheControl(value))
      return setHeader(name, value)
    }) as ServerResponse['setHeader']
  })

  nitroApp.hooks.hook('beforeResponse', async (event) => {
    if (!isPublicContentWrite(event.method, event.path)) return
    if (event.node.res.statusCode >= 400) return
    try {
      await clearPublicRouteCache()
    } catch (err) {
      console.error('[Cache] Public route cache clear failed:', err)
    }
  })
})

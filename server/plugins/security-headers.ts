import type { ServerResponse } from 'node:http'
import { applyPrivateApiHeaders, applyPrivateApiHeadersToRecord } from '~/server/utils/privateApiHeaders'

/**
 * Security Headers Plugin
 *
 * Removes framework fingerprint headers from all rendered responses and
 * enforces private-cache headers for sensitive admin/auth API responses,
 * including error responses. `render:response` covers the rendered path;
 * `beforeResponse` also fires for thrown errors (401/403/etc.) where the
 * render pipeline is skipped.
 */

function isPrivateApiPath(path: string) {
  return path.startsWith('/api/v1/admin')
    || path.startsWith('/api/v1/auth')
    || path.startsWith('/api/v1/sync')
}

export default defineNitroPlugin((nitroApp) => {
  // Nuxt's renderer sets `x-powered-by: Nuxt` straight on the response; the
  // render:response delete below does not reach it. Drop it at the source.
  nitroApp.hooks.hook('request', (event) => {
    const res = event.node.res as ServerResponse
    const setHeader = res.setHeader.bind(res)
    res.setHeader = ((name: string, value: number | string | readonly string[]) => {
      if (name.toLowerCase() === 'x-powered-by') return res
      return setHeader(name, value)
    }) as ServerResponse['setHeader']
  })

  nitroApp.hooks.hook('beforeResponse', (event) => {
    if (!event.node.res.headersSent) event.node.res.removeHeader('x-powered-by')
  })

  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (!response.headers) return

    delete response.headers['x-powered-by']
    delete response.headers['X-Powered-By']

    const path = event?.path || event?.node?.req?.url || ''
    if (!isPrivateApiPath(path)) return

    applyPrivateApiHeadersToRecord(response.headers, response.headers.Vary)
  })

  // Error path — h3's sendError sets `Cache-Control: no-cache` by default,
  // which overrides the middleware headers. Re-apply after the error is
  // serialized so 401/403/etc. on admin/auth still carry private-cache headers.
  nitroApp.hooks.hook('error', (error, { event }) => {
    const path = event?.path || event?.node?.req?.url || ''
    // Expected 404s (e.g. stale OG image URLs) are not actionable; keep the
    // console focused on real failures that can surface as live HTTP 500s.
    const err = error as unknown as { statusCode?: number, unhandled?: boolean }
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500
    const unhandled = Boolean(err.unhandled)
    if (statusCode >= 500 || unhandled) {
      console.error('[Nitro error]', path, error)
    }
    if (!event) return
    setResponseHeader(event, 'Cache-Control', 'private, no-store, no-cache, must-revalidate')
    if (!isPrivateApiPath(path)) return

    applyPrivateApiHeaders(event)
  })
})

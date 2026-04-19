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
  return path.startsWith('/api/v1/admin') || path.startsWith('/api/v1/auth')
}

export default defineNitroPlugin((nitroApp) => {
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
  nitroApp.hooks.hook('error', (_error, { event }) => {
    if (!event) return
    const path = event.path || event.node?.req?.url || ''
    if (!isPrivateApiPath(path)) return

    applyPrivateApiHeaders(event)
  })
})

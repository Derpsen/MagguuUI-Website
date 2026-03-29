import { applyPrivateApiHeadersToRecord } from '~/server/utils/privateApiHeaders'

/**
 * Security Headers Plugin
 *
 * Removes framework fingerprint headers from all rendered responses and
 * enforces private-cache headers for sensitive admin/auth API responses,
 * including error responses.
 */

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    if (!response.headers) return

    delete response.headers['x-powered-by']
    delete response.headers['X-Powered-By']

    const path = event?.path || event?.node?.req?.url || ''
    const isPrivateApi = path.startsWith('/api/v1/admin') || path.startsWith('/api/v1/auth')

    if (!isPrivateApi) return

    applyPrivateApiHeadersToRecord(response.headers, response.headers.Vary)
  })
})

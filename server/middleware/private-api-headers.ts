/**
 * Server Middleware - Private API headers
 *
 * Prevents caching/indexing of sensitive admin/auth responses and
 * ensures caches vary by cookie/auth state.
 */

import { applyPrivateApiHeaders } from '~/server/utils/privateApiHeaders'

export default defineEventHandler((event) => {
  const { pathname } = getRequestURL(event)
  const isPrivateApi =
    pathname.startsWith('/api/v1/admin') ||
    pathname.startsWith('/api/v1/auth') ||
    pathname.startsWith('/api/v1/webhooks')

  if (!isPrivateApi) return

  applyPrivateApiHeaders(event)
})

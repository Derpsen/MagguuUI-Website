import { applyPrivateApiHeaders } from '~/server/utils/privateApiHeaders'

/**
 * Server Middleware - Admin API Protection
 *
 * Automatically protects ALL /api/v1/admin/* routes.
 * Requires valid JWT Bearer token in Authorization header.
 */

export default defineEventHandler((event) => {
  const url = getRequestURL(event)

  // Only protect admin API routes
  if (!url.pathname.startsWith('/api/v1/admin')) return

  // Keep rejected admin responses private and non-cacheable too.
  applyPrivateApiHeaders(event)

  // Verify JWT
  const auth = requireAuth(event)

  // Viewers may only read — block all write operations
  const method = getMethod(event)
  if (method !== 'GET' && auth.role === 'viewer') {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }
})

import type { H3Event } from 'h3'
import { requireAuth } from '~/server/utils/auth'

type JwtPayload = ReturnType<typeof requireAuth>

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Authorize an /api/v1/admin/* request: valid JWT/session, and viewers may
 * only use safe methods. The admin-api middleware calls this first and caches
 * the result on the event; every admin handler calls it again as defense in
 * depth so a middleware bypass (path-encoding tricks, a future router change)
 * can never reach handler logic unauthenticated.
 */
export function requireAdminAccess(event: H3Event): JwtPayload {
  const cached = event.context.adminAuth as JwtPayload | undefined
  if (cached) return cached

  const auth = requireAuth(event)
  if (!SAFE_METHODS.has(getMethod(event)) && auth.role === 'viewer') {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }
  event.context.adminAuth = auth
  return auth
}

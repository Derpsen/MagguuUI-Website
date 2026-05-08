/**
 * Server Middleware - Admin API Protection
 *
 * Automatically protects ALL /api/v1/admin/* routes.
 * Requires valid JWT Bearer token in Authorization header.
 * Also enforces Origin checks on /api/v1/auth/* state-changing requests so
 * login-CSRF can't ride on a SameSite relax or a future browser quirk.
 * Private cache headers are applied by middleware/private-api-headers.ts.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function enforceSameOrigin(event: Parameters<Parameters<typeof defineEventHandler>[0]>[0]) {
  const origin = getHeader(event, 'origin')
  // Server-to-server callers (API key flows, curl) typically omit Origin —
  // they're still gated by the JWT/API-key check downstream. Only mismatched
  // Origin headers are rejected here.
  if (!origin) return

  let originHost = ''
  try {
    originHost = new URL(origin).host
  } catch {
    throw createError({ statusCode: 403, message: 'Invalid Origin header' })
  }
  const requestHost = getRequestHost(event)
  if (originHost !== requestHost) {
    throw createError({ statusCode: 403, message: 'Cross-origin request blocked' })
  }
}

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname
  const method = getMethod(event)

  const isAdmin = path.startsWith('/api/v1/admin')
  const isAuth = path.startsWith('/api/v1/auth')

  if (!isAdmin && !isAuth) return

  // CSRF defense-in-depth on every state-changing request to admin/auth
  // surfaces. SameSite=Strict + HttpOnly cookies already block cross-site
  // form posts in modern browsers, but a future relax (or a SameSite bypass)
  // would otherwise re-expose the entire authenticated surface.
  if (!SAFE_METHODS.has(method)) {
    enforceSameOrigin(event)
  }

  // /api/v1/auth/* is intentionally not JWT-gated — login endpoints must
  // remain reachable for unauthenticated callers. Stop here.
  if (!isAdmin) return

  // Verify JWT
  const auth = requireAuth(event)

  // Viewers may only read — block all write operations
  if (!SAFE_METHODS.has(method) && auth.role === 'viewer') {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
  }
})

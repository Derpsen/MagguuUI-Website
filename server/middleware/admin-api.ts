/**
 * Server Middleware — Admin API Protection
 *
 * Automatically protects ALL /api/v1/admin/* routes.
 * Requires valid JWT Bearer token in Authorization header.
 */

export default defineEventHandler((event) => {
  const url = getRequestURL(event)

  // Only protect admin API routes
  if (!url.pathname.startsWith('/api/v1/admin')) return

  // Verify JWT
  requireAuth(event)
})

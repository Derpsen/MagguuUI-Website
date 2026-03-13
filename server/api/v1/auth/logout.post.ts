/**
 * POST /api/v1/auth/logout
 *
 * Revoke the current session server-side.
 * Token becomes invalid immediately.
 */

import { revokeSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const token = extractToken(event)
  clearAuthCookie(event)
  if (!token) return { success: true }

  try {
    const payload = verifyToken(token)
    if (payload.sessionId) {
      revokeSession(payload.sessionId)
    }
  } catch {
    // Token already invalid — just proceed
  }

  return { success: true, data: { message: 'Logged out' } }
})

/**
 * GET /api/v1/auth/session
 *
 * Soft session restore for client hydration. Unlike the guarded admin
 * endpoint, missing/invalid cookies return success with `null` so public pages
 * do not emit noisy 401 console errors during normal anonymous visits.
 */

import { clearAuthCookie, extractToken, getCurrentAuthUser, verifyToken } from '~/server/utils/auth'
import { hashToken, parseBrowser, parseOS, revokeSession, validateSession } from '~/server/utils/session'

export default defineEventHandler((event) => {
  const token = extractToken(event)
  if (!token || token.length > 4096) {
    return apiSuccess(null)
  }

  try {
    const payload = verifyToken(token)
    let sessionId = payload.sessionId ?? null

    if (payload.sessionId) {
      const session = validateSession(hashToken(token))
      if (!session || session.userId !== payload.userId) {
        clearAuthCookie(event)
        return apiSuccess(null)
      }
      if (session.browser && session.os) {
        const currentUa = getHeader(event, 'user-agent') || ''
        if (session.browser !== parseBrowser(currentUa) || session.os !== parseOS(currentUa)) {
          revokeSession(session.id)
          clearAuthCookie(event)
          return apiSuccess(null)
        }
      }
      sessionId = session.id
    }

    const user = getCurrentAuthUser(payload.userId)

    if (!user) {
      clearAuthCookie(event)
      return apiSuccess(null)
    }

    return apiSuccess({
      id: sessionId,
      user,
    })
  } catch {
    clearAuthCookie(event)
    return apiSuccess(null)
  }
})

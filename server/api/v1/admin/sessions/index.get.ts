/**
 * GET /api/v1/admin/sessions
 *
 * List all active sessions for the current user.
 * Marks which session is the current one via tokenHash comparison.
 */

import { getUserSessions, hashToken } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const token = extractToken(event)
  const currentTokenHash = token ? hashToken(token) : null

  const userSessions = getUserSessions(auth.userId)

  const data = userSessions.map(s => ({
    id: s.id,
    browser: s.browser,
    os: s.os,
    deviceType: s.deviceType,
    ipAddress: s.ipAddress,
    lastActive: s.lastActive,
    expiresAt: s.expiresAt,
    createdAt: s.createdAt,
    isCurrent: s.tokenHash === currentTokenHash,
  }))

  return apiSuccess(data)
})

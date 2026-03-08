/**
 * GET /api/v1/admin/sessions/current
 *
 * Get info about the current active session.
 */

import { hashToken, validateSession } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const token = extractToken(event)

  if (!token) {
    throw createError({ statusCode: 401, message: 'No token' })
  }

  const tokenHash = hashToken(token)
  const session = validateSession(tokenHash)

  if (!session) {
    return {
      success: true,
      data: {
        id: null,
        message: 'Legacy session (no server-side tracking)',
        user: { id: auth.userId, username: auth.username, role: auth.role },
      },
    }
  }

  return {
    success: true,
    data: {
      id: session.id,
      browser: session.browser,
      os: session.os,
      deviceType: session.deviceType,
      ipAddress: session.ipAddress,
      lastActive: session.lastActive,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      user: { id: auth.userId, username: auth.username, role: auth.role },
    },
  }
})

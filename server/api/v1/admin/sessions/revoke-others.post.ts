/**
 * POST /api/v1/admin/sessions/revoke-others
 *
 * Revoke all sessions except the current one.
 * User stays logged in, all other devices get signed out.
 */

import { revokeAllUserSessions } from '~/server/utils/session'
import { sqlite } from '~/server/database'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const currentSessionId = event.context.sessionId

  if (!currentSessionId) {
    throw createError({ statusCode: 400, message: 'No active session found. Please re-login.' })
  }

  // Count how many sessions will be revoked
  const countResult = sqlite.prepare(
    'SELECT COUNT(*) as count FROM sessions WHERE user_id = ? AND id != ? AND is_revoked = 0'
  ).get(auth.userId, currentSessionId) as { count: number }

  revokeAllUserSessions(auth.userId, currentSessionId)

  return {
    success: true,
    data: { revokedCount: countResult.count },
  }
})

/**
 * DELETE /api/v1/admin/sessions/:id
 *
 * Revoke a specific session. Cannot revoke own current session.
 */

import { revokeSession, hashToken } from '~/server/utils/session'
import { db } from '~/server/database'
import { sessions } from '~/server/database/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid session ID' })
  }

  // Check if trying to revoke current session
  const token = extractToken(event)
  if (token) {
    const currentHash = hashToken(token)
    const session = db.select().from(sessions)
      .where(eq(sessions.id, id))
      .get()

    if (session?.tokenHash === currentHash) {
      throw createError({ statusCode: 400, message: 'Cannot revoke current session. Use logout instead.' })
    }

    // Ensure user can only revoke their own sessions
    if (session && session.userId !== auth.userId) {
      throw createError({ statusCode: 403, message: 'Cannot revoke another user\'s session' })
    }
  }

  revokeSession(id)

  return { success: true, data: { id } }
})

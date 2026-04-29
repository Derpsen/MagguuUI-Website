/**
 * PUT /api/v1/admin/password
 *
 * Change the current admin user's password.
 */

import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { users } from '~/server/database/schema'
import { validateBody, passwordChangeSchema } from '~/server/utils/validation'
import { revokeAllUserSessions } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)

  // Rate-limit per user to stop a stolen-session brute-force of currentPassword
  // (bcrypt cost 12 makes each guess slow but not free).
  const rl = checkRateLimit(`pw-change:${auth.userId}`, 5, 15 * 60 * 1000, 30 * 60 * 1000)
  if (!rl.allowed) {
    setResponseHeader(event, 'Retry-After', String(rl.retryAfter))
    throw createError({
      statusCode: 429,
      message: `Too many password-change attempts. Try again in ${Math.ceil(rl.retryAfter / 60)} minutes.`,
    })
  }

  const body = await readBody(event)
  const data = validateBody(passwordChangeSchema, body)

  // Get current user
  const user = db.select().from(users).where(eq(users.id, auth.userId)).get()
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Verify current password
  const valid = await bcrypt.compare(data.currentPassword, user.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Current password is incorrect' })
  }

  resetRateLimit(`pw-change:${auth.userId}`)

  // Update password
  const hash = await bcrypt.hash(data.newPassword, 12)
  db.update(users)
    .set({ passwordHash: hash, updatedAt: new Date() })
    .where(eq(users.id, auth.userId))
    .run()

  // Revoke all other active sessions — the current session keeps working, any
  // other device/browser has to re-authenticate with the new password.
  const currentSessionId = event.context.sessionId as number | undefined
  revokeAllUserSessions(auth.userId, currentSessionId)

  return apiSuccess({ message: 'Password changed' })
})

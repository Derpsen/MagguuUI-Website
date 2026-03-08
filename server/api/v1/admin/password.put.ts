/**
 * PUT /api/v1/admin/password
 *
 * Change the current admin user's password.
 */

import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { users } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)

  if (!body?.currentPassword || !body?.newPassword) {
    throw createError({ statusCode: 400, message: 'Current and new password required' })
  }

  const { passwordSchema } = await import('~/server/utils/validation')
  const pwResult = passwordSchema.safeParse(body.newPassword)
  if (!pwResult.success) {
    throw createError({ statusCode: 400, message: pwResult.error.issues[0].message })
  }

  // Get current user
  const user = db.select().from(users).where(eq(users.id, auth.userId)).get()
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  // Verify current password
  const valid = await bcrypt.compare(body.currentPassword, user.passwordHash)
  if (!valid) {
    throw createError({ statusCode: 401, message: 'Current password is incorrect' })
  }

  // Update password
  const hash = await bcrypt.hash(body.newPassword, 12)
  db.update(users)
    .set({ passwordHash: hash, updatedAt: new Date() })
    .where(eq(users.id, auth.userId))
    .run()

  return { success: true, data: { message: 'Password changed' } }
})

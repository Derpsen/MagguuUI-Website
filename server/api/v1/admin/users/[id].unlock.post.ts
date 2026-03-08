/**
 * POST /api/v1/admin/users/:id/unlock
 *
 * Unlock a locked user account. Admin only.
 */

import { unlockAccount } from '~/server/utils/session'
import { db } from '~/server/database'
import { users } from '~/server/database/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)

  if (auth.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid user ID' })
  }

  const user = db.select().from(users).where(eq(users.id, id)).get()
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  unlockAccount(id)

  return { success: true, data: { id, message: 'Account unlocked' } }
})

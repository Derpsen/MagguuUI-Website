/**
 * DELETE /api/v1/admin/users/:id
 * Delete a user (cannot delete yourself).
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { users } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  if (id === auth.userId) {
    throw createError({ statusCode: 400, message: 'Cannot delete own account' })
  }

  const existing = db.select().from(users).where(eq(users.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'User not found' })

  db.delete(users).where(eq(users.id, id)).run()

  logActivity({
    action: 'deleted',
    entityType: 'user',
    entityId: id,
    entityName: existing.username,
    details: { role: existing.role },
    userId: auth.userId,
  })

  return apiSuccess({ id })
})

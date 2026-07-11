/**
 * DELETE /api/v1/admin/users/:id
 * Delete a user (cannot delete yourself).
 */

import { eq, count } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { passkeys, sessions, users } from '~/server/database/schema'
import { revokeAllUserSessions } from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const auth = requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  if (id === auth.userId) {
    throw createError({ statusCode: 400, message: 'Cannot delete own account' })
  }

  const existing = db.select().from(users).where(eq(users.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'User not found' })

  // Refuse to delete the last admin — would leave the panel locked out.
  if (existing.role === 'admin') {
    const adminCountRow = db.select({ n: count() }).from(users).where(eq(users.role, 'admin')).get()
    if ((adminCountRow?.n ?? 0) <= 1) {
      throw createError({ statusCode: 400, message: 'Cannot delete the last admin user' })
    }
  }

  sqlite.transaction(() => {
    // Bootstrap-created databases predate the Drizzle foreign-key declarations,
    // so do not rely on ON DELETE CASCADE to invalidate authentication state.
    revokeAllUserSessions(id)
    db.delete(passkeys).where(eq(passkeys.userId, id)).run()
    db.delete(sessions).where(eq(sessions.userId, id)).run()
    db.delete(users).where(eq(users.id, id)).run()
  })()

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

/**
 * GET /api/v1/admin/users
 * List all admin users (without password hashes).
 */

import { db } from '~/server/database'
import { users } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const rows = db.select({
    id: users.id,
    username: users.username,
    role: users.role,
    lastLogin: users.lastLogin,
    createdAt: users.createdAt,
    isLocked: users.isLocked,
    lockedUntil: users.lockedUntil,
  }).from(users).all()

  return { success: true, data: rows }
})

/**
 * GET /api/v1/admin/login-history
 *
 * DEPRECATED — Redirects to new loginAttempts table.
 * Kept for backward compatibility with any existing code.
 * Returns last 20 login events from the loginAttempts table.
 */

import { desc } from 'drizzle-orm'
import { db } from '~/server/database'
import { loginAttempts } from '~/server/database/schema'

export default defineEventHandler(async () => {
  try {
    const rows = db.select({
      id: loginAttempts.id,
      username: loginAttempts.username,
      ipAddress: loginAttempts.ipAddress,
      browser: loginAttempts.browser,
      os: loginAttempts.os,
      success: loginAttempts.success,
      failReason: loginAttempts.failReason,
      isFlagged: loginAttempts.isFlagged,
      flagReason: loginAttempts.flagReason,
      createdAt: loginAttempts.createdAt,
    }).from(loginAttempts)
      .orderBy(desc(loginAttempts.createdAt))
      .limit(20)
      .all()

    return { success: true, data: rows }
  } catch {
    return { success: true, data: [] }
  }
})

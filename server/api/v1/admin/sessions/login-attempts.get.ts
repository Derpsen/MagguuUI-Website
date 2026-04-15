/**
 * GET /api/v1/admin/sessions/login-attempts
 *
 * Get login attempt history with flagging info.
 * Query params: ?limit=50&flaggedOnly=true
 */

import { sqlite } from '~/server/database'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 50, 200)
  const flaggedOnly = query.flaggedOnly === 'true'

  let sql = 'SELECT * FROM login_attempts'
  const params: number[] = []

  if (flaggedOnly) {
    sql += ' WHERE is_flagged = 1'
  }

  sql += ' ORDER BY created_at DESC LIMIT ?'
  params.push(limit)

  const attempts = sqlite.prepare(sql).all(...params)

  // Also get quick stats
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
  const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60

  const countQuery = (s: string, arg: number) =>
    (sqlite.prepare(s).get(arg) as { count: number } | undefined)?.count ?? 0

  const stats = {
    totalAttempts: countQuery('SELECT COUNT(*) as count FROM login_attempts WHERE created_at > ?', thirtyDaysAgo),
    failedAttempts: countQuery('SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND created_at > ?', thirtyDaysAgo),
    flaggedAttempts: countQuery('SELECT COUNT(*) as count FROM login_attempts WHERE is_flagged = 1 AND created_at > ?', thirtyDaysAgo),
    recentFailed: countQuery('SELECT COUNT(*) as count FROM login_attempts WHERE success = 0 AND created_at > ?', weekAgo),
  }

  return apiSuccess(attempts, { stats })
})

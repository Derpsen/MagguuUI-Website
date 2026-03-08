/**
 * GET /api/v1/admin/activity/stats
 *
 * Quick stats for the activity log page (last 7 days).
 */

import { sql } from 'drizzle-orm'
import { db } from '~/server/database'

export default defineEventHandler(async () => {
  const weekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60

  const created = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM activity_log WHERE action = 'created' AND created_at > ${weekAgo}
  `)
  const updated = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM activity_log WHERE action = 'updated' AND created_at > ${weekAgo}
  `)
  const deleted = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM activity_log WHERE action = 'deleted' AND created_at > ${weekAgo}
  `)

  return {
    success: true,
    data: {
      created: created?.count || 0,
      updated: updated?.count || 0,
      deleted: deleted?.count || 0,
    },
  }
})

/**
 * GET /api/v1/latest-change
 *
 * Returns the latest profile/wowup/layout change for the homepage badge.
 * Public endpoint — no auth required.
 */

import { desc, inArray } from 'drizzle-orm'
import { db } from '~/server/database'
import { activityLog } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const row = db.select().from(activityLog)
    .where(inArray(activityLog.entityType, ['profile', 'wowup', 'layout']))
    .orderBy(desc(activityLog.createdAt))
    .limit(1)
    .get()

  if (!row) {
    return apiSuccess(null)
  }

  return apiSuccess({
    action: row.action,
    type: row.entityType,
    name: row.entityName,
    createdAt: row.createdAt,
  })
})

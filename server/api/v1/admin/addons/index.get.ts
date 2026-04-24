/**
 * GET /api/v1/admin/addons
 *
 * Returns the full addon catalogue (including hidden + unavailable) for admin
 * management. Protected by server middleware (JWT required).
 */

import { asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { addons } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const rows = db.select().from(addons)
    .orderBy(asc(addons.category), asc(addons.sortOrder), asc(addons.name))
    .all()

  return apiSuccess(rows)
})

/**
 * GET /api/v1/admin/layouts
 */

import { asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const all = db.select().from(characterLayouts).orderBy(asc(characterLayouts.sortOrder)).all()
  return apiSuccess(all)
})

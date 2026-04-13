/**
 * GET /api/v1/admin/changelogs
 */

import { desc } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const all = db.select().from(changelogs).orderBy(desc(changelogs.createdAt)).all()
  return apiSuccess(all)
})

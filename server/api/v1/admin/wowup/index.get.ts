/**
 * GET /api/v1/admin/wowup
 */

import { asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const all = db.select().from(wowupStrings).orderBy(asc(wowupStrings.name)).all()
  return { success: true, data: all }
})

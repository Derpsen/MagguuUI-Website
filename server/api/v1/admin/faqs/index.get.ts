/**
 * GET /api/v1/admin/faqs
 */

import { asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { faqs } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const all = db.select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.id)).all()
  return apiSuccess(all)
})

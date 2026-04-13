/**
 * GET /api/v1/admin/fields
 * List field definitions, optionally filtered by entityType
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { fieldDefinitions } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const entityType = query.entityType as string | undefined

  let results
  if (entityType) {
    results = db.select().from(fieldDefinitions)
      .where(eq(fieldDefinitions.entityType, entityType))
      .orderBy(fieldDefinitions.sortOrder)
      .all()
  } else {
    results = db.select().from(fieldDefinitions)
      .orderBy(fieldDefinitions.entityType, fieldDefinitions.sortOrder)
      .all()
  }

  return apiSuccess(results)
})

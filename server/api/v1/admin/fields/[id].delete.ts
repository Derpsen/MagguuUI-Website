/**
 * DELETE /api/v1/admin/fields/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { fieldDefinitions } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(fieldDefinitions).where(eq(fieldDefinitions.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Field not found' })

  db.delete(fieldDefinitions).where(eq(fieldDefinitions.id, id)).run()

  logActivity({
    action: 'deleted',
    entityType: 'field',
    entityId: id,
    entityName: `${existing.entityType}.${existing.fieldName}`,
    userId: auth.userId,
  })

  return apiSuccess(null)
})

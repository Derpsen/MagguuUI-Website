/**
 * DELETE /api/v1/admin/api-keys/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { apiKeys } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(apiKeys).where(eq(apiKeys.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'API key not found' })

  db.delete(apiKeys).where(eq(apiKeys.id, id)).run()

  logActivity({
    action: 'deleted',
    entityType: 'api-key',
    entityId: id,
    entityName: existing.name,
    details: { preview: existing.keyPreview },
    userId: auth.userId,
  })

  return apiSuccess({ id })
})

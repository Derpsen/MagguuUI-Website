/**
 * DELETE /api/v1/admin/api-keys/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { apiKeys } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(apiKeys).where(eq(apiKeys.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'API key not found' })

  db.delete(apiKeys).where(eq(apiKeys.id, id)).run()
  return apiSuccess({ id })
})

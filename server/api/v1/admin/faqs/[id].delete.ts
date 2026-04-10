/**
 * DELETE /api/v1/admin/faqs/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { faqs } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(faqs).where(eq(faqs.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  db.delete(faqs).where(eq(faqs.id, id)).run()

  logActivity({
    action: 'deleted',
    entityType: 'faq',
    entityId: id,
    entityName: existing.question.substring(0, 60),
  })

  return { success: true, data: { id } }
})

/**
 * PUT /api/v1/admin/faqs/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { faqs } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(faqs).where(eq(faqs.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const body = await readBody(event)

  const result = db.update(faqs)
    .set({
      ...(body.category !== undefined && { category: body.category }),
      ...(body.question !== undefined && { question: body.question }),
      ...(body.answer !== undefined && { answer: body.answer }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
      updatedAt: new Date(),
    })
    .where(eq(faqs.id, id))
    .returning().get()

  logActivity({
    action: 'updated',
    entityType: 'faq',
    entityId: id,
    entityName: (body.question || existing.question).substring(0, 60),
  })

  return { success: true, data: result }
})

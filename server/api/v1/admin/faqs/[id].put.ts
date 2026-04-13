/**
 * PUT /api/v1/admin/faqs/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { faqs } from '~/server/database/schema'
import { validateBody, faqUpdateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(faqs).where(eq(faqs.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const body = await readBody(event)
  const data = validateBody(faqUpdateSchema, body)

  const result = db.update(faqs)
    .set({
      ...(data.category !== undefined && { category: data.category }),
      ...(data.question !== undefined && { question: data.question }),
      ...(data.answer !== undefined && { answer: data.answer }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      updatedAt: new Date(),
    })
    .where(eq(faqs.id, id))
    .returning().get()

  logActivity({
    action: 'updated',
    entityType: 'faq',
    entityId: id,
    entityName: (data.question || existing.question).substring(0, 60),
  })

  return apiSuccess(result)
})

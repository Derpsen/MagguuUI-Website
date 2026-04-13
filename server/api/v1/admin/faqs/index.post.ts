/**
 * POST /api/v1/admin/faqs
 */

import { db } from '~/server/database'
import { faqs } from '~/server/database/schema'
import { validateBody, faqCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(faqCreateSchema, body)

  const result = db.insert(faqs).values({
    category: data.category,
    question: data.question,
    answer: data.answer,
    sortOrder: data.sortOrder ?? 0,
    isVisible: data.isVisible ?? true,
  }).returning().get()

  logActivity({
    action: 'created',
    entityType: 'faq',
    entityId: result.id,
    entityName: data.question.substring(0, 60),
  })

  setResponseStatus(event, 201)
  return apiSuccess(result)
})

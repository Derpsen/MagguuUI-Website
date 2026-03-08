/**
 * POST /api/v1/admin/faqs
 */

import { db } from '~/server/database'
import { faqs } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.category || !body?.question || !body?.answer) {
    throw createError({ statusCode: 400, message: 'Category, question and answer are required' })
  }

  const result = db.insert(faqs).values({
    category: body.category,
    question: body.question,
    answer: body.answer,
    sortOrder: body.sortOrder ?? 0,
    isVisible: body.isVisible ?? true,
  }).returning().get()

  logActivity({
    action: 'created',
    entityType: 'faq' as any,
    entityId: result.id,
    entityName: body.question.substring(0, 60),
  })

  setResponseStatus(event, 201)
  return { success: true, data: result }
})

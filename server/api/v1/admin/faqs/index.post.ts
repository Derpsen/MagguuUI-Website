/**
 * POST /api/v1/admin/faqs
 */

import { db, sqlite } from '~/server/database'
import { faqSnapshot, recordAuditSafe } from '~/server/utils/auditLog'
import { faqs } from '~/server/database/schema'
import { validateBody, faqCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const body = await readBody(event)
  const data = validateBody(faqCreateSchema, body)

  const result = db.insert(faqs).values({
    category: data.category,
    question: data.question,
    answer: data.answer,
    sortOrder: data.sortOrder ?? 0,
    isVisible: data.isVisible ?? true,
  }).returning().get()

  recordAuditSafe(sqlite, { action: 'created', entityType: 'faq', entityId: result.id, entityName: data.question.substring(0, 60), before: null, after: faqSnapshot(result), userId: auth.userId })
  logActivity({
    action: 'created',
    entityType: 'faq',
    entityId: result.id,
    entityName: data.question.substring(0, 60),
  })

  setResponseStatus(event, 201)
  return apiSuccess(result)
})

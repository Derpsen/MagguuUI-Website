/**
 * POST /api/v1/admin/faqs/reorder
 */

import { faqs } from '~/server/database/schema'
import { reorderBySortOrder } from '~/server/utils/adminCrud'
import { validateBody, reorderSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)
  const data = validateBody(reorderSchema, body)

  // Preserve prior FAQ behavior: sortOrder only (no updatedAt touch).
  reorderBySortOrder(faqs, data.items, { touchUpdatedAt: false })

  logActivity({
    action: 'updated',
    entityType: 'faq',
    entityName: `${data.items.length} FAQs`,
    details: 'reordered',
    userId: auth.userId,
  })

  return apiSuccess({ updated: data.items.length })
})

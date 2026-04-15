/**
 * POST /api/v1/admin/faqs/reorder
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { faqs } from '~/server/database/schema'
import { validateBody, reorderSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)
  const data = validateBody(reorderSchema, body)

  sqlite.transaction(() => {
    for (const item of data.items) {
      db.update(faqs).set({ sortOrder: item.sortOrder }).where(eq(faqs.id, item.id)).run()
    }
  })()

  logActivity({
    action: 'updated',
    entityType: 'faq',
    entityName: `${data.items.length} FAQs`,
    details: 'reordered',
    userId: auth.userId,
  })

  return apiSuccess({ updated: data.items.length })
})

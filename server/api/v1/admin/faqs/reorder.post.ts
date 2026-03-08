/**
 * POST /api/v1/admin/faqs/reorder
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { faqs } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const items: { id: number; sortOrder: number }[] = body?.items

  if (!Array.isArray(items)) {
    throw createError({ statusCode: 400, message: 'items array required' })
  }

  for (const item of items) {
    db.update(faqs).set({ sortOrder: item.sortOrder }).where(eq(faqs.id, item.id)).run()
  }

  return { success: true, data: { updated: items.length } }
})

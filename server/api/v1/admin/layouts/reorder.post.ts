/**
 * POST /api/v1/admin/layouts/reorder
 * Bulk update sort order. Body: { items: [{ id, sortOrder }] }
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!Array.isArray(body?.items)) {
    throw createError({ statusCode: 400, message: 'items array required' })
  }

  for (const item of body.items) {
    if (item.id && item.sortOrder !== undefined) {
      db.update(characterLayouts)
        .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
        .where(eq(characterLayouts.id, item.id))
        .run()
    }
  }

  triggerGitHubSync('layouts-reordered').catch(() => {})
  return { success: true }
})

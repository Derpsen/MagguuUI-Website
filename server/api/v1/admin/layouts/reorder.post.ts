/**
 * POST /api/v1/admin/layouts/reorder
 * Bulk update sort order. Body: { items: [{ id, sortOrder }] }
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!Array.isArray(body?.items)) {
    throw createError({ statusCode: 400, message: 'items array required' })
  }

  const items = body.items.filter(
    (i: any) => typeof i?.id === 'number' && typeof i?.sortOrder === 'number'
  )

  const now = new Date()
  sqlite.transaction(() => {
    for (const item of items) {
      db.update(characterLayouts)
        .set({ sortOrder: item.sortOrder, updatedAt: now })
        .where(eq(characterLayouts.id, item.id))
        .run()
    }
  })()

  triggerGitHubSync('layouts-reordered').catch(() => {})
  return { success: true, data: { updated: items.length } }
})

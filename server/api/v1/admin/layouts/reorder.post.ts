/**
 * POST /api/v1/admin/layouts/reorder
 * Bulk update sort order. Body: { items: [{ id, sortOrder }] }
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'
import { validateBody, reorderSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(reorderSchema, body)

  const now = new Date()
  sqlite.transaction(() => {
    for (const item of data.items) {
      db.update(characterLayouts)
        .set({ sortOrder: item.sortOrder, updatedAt: now })
        .where(eq(characterLayouts.id, item.id))
        .run()
    }
  })()

  triggerGitHubSync('layouts-reordered').catch(() => {})
  return apiSuccess({ updated: data.items.length })
})

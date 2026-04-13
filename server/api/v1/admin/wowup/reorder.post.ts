/**
 * POST /api/v1/admin/wowup/reorder
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'
import { validateBody, reorderSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(reorderSchema, body)

  const now = new Date()
  sqlite.transaction(() => {
    for (const item of data.items) {
      db.update(wowupStrings)
        .set({ sortOrder: item.sortOrder, updatedAt: now })
        .where(eq(wowupStrings.id, item.id))
        .run()
    }
  })()

  triggerGitHubSync('wowup-reordered').catch(() => {})
  return apiSuccess({ updated: data.items.length })
})

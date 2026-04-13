/**
 * POST /api/v1/admin/profiles/reorder
 * Bulk update sort order from drag & drop.
 * Body: { items: [{ id: number, sortOrder: number }] }
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { profiles } from '~/server/database/schema'
import { validateBody, reorderSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(reorderSchema, body)

  // Wrap reorder in a single SQLite transaction to avoid N fsync round-trips.
  const now = new Date()
  sqlite.transaction(() => {
    for (const item of data.items) {
      db.update(profiles)
        .set({ sortOrder: item.sortOrder, updatedAt: now })
        .where(eq(profiles.id, item.id))
        .run()
    }
  })()

  triggerGitHubSync('profiles-reordered').catch(() => {})
  return apiSuccess({ updated: data.items.length })
})

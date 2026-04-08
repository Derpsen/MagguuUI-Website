/**
 * POST /api/v1/admin/profiles/reorder
 * Bulk update sort order from drag & drop.
 * Body: { items: [{ id: number, sortOrder: number }] }
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { profiles } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!Array.isArray(body?.items)) {
    throw createError({ statusCode: 400, message: 'items array required' })
  }

  const items = body.items.filter(
    (i: any) => typeof i?.id === 'number' && typeof i?.sortOrder === 'number'
  )

  // Wrap reorder in a single SQLite transaction to avoid N fsync round-trips.
  const now = new Date()
  sqlite.transaction(() => {
    for (const item of items) {
      db.update(profiles)
        .set({ sortOrder: item.sortOrder, updatedAt: now })
        .where(eq(profiles.id, item.id))
        .run()
    }
  })()

  triggerGitHubSync('profiles-reordered').catch(() => {})
  return { success: true, data: { updated: items.length } }
})

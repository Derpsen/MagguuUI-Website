/**
 * POST /api/v1/admin/profiles/reorder
 * Bulk update sort order from drag & drop.
 * Body: { items: [{ id: number, sortOrder: number }] }
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!Array.isArray(body?.items)) {
    throw createError({ statusCode: 400, message: 'items array required' })
  }

  for (const item of body.items) {
    if (typeof item.id !== 'number' || typeof item.sortOrder !== 'number') continue
    db.update(profiles)
      .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
      .where(eq(profiles.id, item.id))
      .run()
  }

  triggerGitHubSync('profiles-reordered').catch(() => {})
  return { success: true, data: { updated: body.items.length } }
})

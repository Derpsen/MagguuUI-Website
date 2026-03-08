/**
 * POST /api/v1/admin/wowup/reorder
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!Array.isArray(body?.items)) throw createError({ statusCode: 400, message: 'items array required' })

  for (const item of body.items) {
    if (typeof item.id !== 'number' || typeof item.sortOrder !== 'number') continue
    db.update(wowupStrings).set({ sortOrder: item.sortOrder, updatedAt: new Date() }).where(eq(wowupStrings.id, item.id)).run()
  }
  triggerGitHubSync('wowup-reordered').catch(() => {})
  return { success: true, data: { updated: body.items.length } }
})

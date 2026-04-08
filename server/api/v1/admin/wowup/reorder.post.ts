/**
 * POST /api/v1/admin/wowup/reorder
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!Array.isArray(body?.items)) throw createError({ statusCode: 400, message: 'items array required' })

  const items = body.items.filter(
    (i: any) => typeof i?.id === 'number' && typeof i?.sortOrder === 'number'
  )

  const now = new Date()
  sqlite.transaction(() => {
    for (const item of items) {
      db.update(wowupStrings)
        .set({ sortOrder: item.sortOrder, updatedAt: now })
        .where(eq(wowupStrings.id, item.id))
        .run()
    }
  })()

  triggerGitHubSync('wowup-reordered').catch(() => {})
  return { success: true, data: { updated: items.length } }
})

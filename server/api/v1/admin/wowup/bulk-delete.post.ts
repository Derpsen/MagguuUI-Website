/**
 * POST /api/v1/admin/wowup/bulk-delete
 * Delete multiple wowup strings by IDs
 */

import { inArray } from 'drizzle-orm'
import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    throw createError({ statusCode: 400, message: 'IDs array required' })
  }

  const ids = body.ids.map(Number).filter((n: number) => !isNaN(n))
  db.delete(wowupStrings).where(inArray(wowupStrings.id, ids)).run()
  logActivity({ action: 'deleted', entityType: 'wowup', entityName: `${ids.length} wowup strings`, details: `Bulk deleted IDs: ${ids.join(', ')}` })
  triggerGitHubSync(`wowup-bulk-deleted: ${ids.length} strings`).catch(() => {})

  return { success: true, data: { deleted: ids.length } }
})

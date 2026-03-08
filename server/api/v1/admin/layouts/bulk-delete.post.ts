/**
 * POST /api/v1/admin/layouts/bulk-delete
 * Delete multiple character layouts by IDs
 */

import { inArray } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    throw createError({ statusCode: 400, message: 'IDs array required' })
  }

  const ids = body.ids.map(Number).filter((n: number) => !isNaN(n))
  db.delete(characterLayouts).where(inArray(characterLayouts.id, ids)).run()
  logActivity({ action: 'deleted', entityType: 'layout', entityName: `${ids.length} layouts`, details: `Bulk deleted IDs: ${ids.join(', ')}` })
  triggerGitHubSync(`layouts-bulk-deleted: ${ids.length} items`).catch(() => {})
  return { success: true, data: { deleted: ids.length } }
})

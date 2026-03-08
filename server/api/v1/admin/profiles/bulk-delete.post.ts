/**
 * POST /api/v1/admin/profiles/bulk-delete
 * Delete multiple profiles by IDs
 */

import { inArray } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!Array.isArray(body?.ids) || body.ids.length === 0) {
    throw createError({ statusCode: 400, message: 'IDs array required' })
  }

  const ids = body.ids.map(Number).filter((n: number) => !isNaN(n))
  db.delete(profiles).where(inArray(profiles.id, ids)).run()
  logActivity({ action: 'deleted', entityType: 'profile', entityName: `${ids.length} profiles`, details: `Bulk deleted IDs: ${ids.join(', ')}` })
  triggerGitHubSync(`profiles-bulk-deleted: ${ids.length} profiles`).catch(() => {})

  return { success: true, data: { deleted: ids.length } }
})

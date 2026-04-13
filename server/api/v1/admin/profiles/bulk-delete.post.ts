/**
 * POST /api/v1/admin/profiles/bulk-delete
 * Delete multiple profiles by IDs
 */

import { inArray } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'
import { validateBody, bulkDeleteSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(bulkDeleteSchema, body)

  db.delete(profiles).where(inArray(profiles.id, data.ids)).run()
  logActivity({ action: 'deleted', entityType: 'profile', entityName: `${data.ids.length} profiles`, details: `Bulk deleted IDs: ${data.ids.join(', ')}` })
  triggerGitHubSync(`profiles-bulk-deleted: ${data.ids.length} profiles`).catch(() => {})

  return apiSuccess({ deleted: data.ids.length })
})

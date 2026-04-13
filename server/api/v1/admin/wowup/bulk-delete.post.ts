/**
 * POST /api/v1/admin/wowup/bulk-delete
 * Delete multiple wowup strings by IDs
 */

import { inArray } from 'drizzle-orm'
import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'
import { validateBody, bulkDeleteSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(bulkDeleteSchema, body)

  db.delete(wowupStrings).where(inArray(wowupStrings.id, data.ids)).run()
  logActivity({ action: 'deleted', entityType: 'wowup', entityName: `${data.ids.length} wowup strings`, details: `Bulk deleted IDs: ${data.ids.join(', ')}` })
  triggerGitHubSync(`wowup-bulk-deleted: ${data.ids.length} strings`).catch(() => {})

  return apiSuccess({ deleted: data.ids.length })
})

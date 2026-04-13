/**
 * POST /api/v1/admin/layouts/bulk-delete
 * Delete multiple character layouts by IDs
 */

import { inArray } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'
import { validateBody, bulkDeleteSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(bulkDeleteSchema, body)

  db.delete(characterLayouts).where(inArray(characterLayouts.id, data.ids)).run()
  logActivity({ action: 'deleted', entityType: 'layout', entityName: `${data.ids.length} layouts`, details: `Bulk deleted IDs: ${data.ids.join(', ')}` })
  triggerGitHubSync(`layouts-bulk-deleted: ${data.ids.length} items`).catch(() => {})
  return apiSuccess({ deleted: data.ids.length })
})

/**
 * DELETE /api/v1/admin/wowup/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'
import { parseRouteId } from '~/server/utils/adminCrud'

export default defineEventHandler(async (event) => {
  const id = parseRouteId(event)

  const existing = db.select().from(wowupStrings).where(eq(wowupStrings.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  db.delete(wowupStrings).where(eq(wowupStrings.id, id)).run()
  logActivity({ action: 'deleted', entityType: 'wowup', entityId: id, entityName: existing.name, autoChangelog: true })
  triggerGitHubSync(`wowup-deleted: ${existing.name}`).catch(() => {})
  return apiSuccess({ id })
})

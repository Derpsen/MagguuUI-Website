/**
 * DELETE /api/v1/admin/wowup/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(wowupStrings).where(eq(wowupStrings.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  db.delete(wowupStrings).where(eq(wowupStrings.id, id)).run()
  logActivity({ action: 'deleted', entityType: 'wowup', entityId: id, entityName: existing.name, autoChangelog: true })
  triggerGitHubSync(`wowup-deleted: ${existing.name}`).catch(() => {})
  return apiSuccess({ id })
})

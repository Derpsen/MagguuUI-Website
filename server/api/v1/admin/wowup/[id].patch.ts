/**
 * PATCH /api/v1/admin/wowup/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(wowupStrings).where(eq(wowupStrings.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const body = await readBody(event)

  const result = db.update(wowupStrings)
    .set({
      ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
      updatedAt: new Date(),
    })
    .where(eq(wowupStrings.id, id))
    .returning().get()

  logActivity({ action: 'updated', entityType: 'wowup', entityId: id, entityName: existing.name, details: 'visibility toggled' })
  triggerGitHubSync(`wowup-toggled: ${existing.name}`).catch(() => {})
  return { success: true, data: result }
})

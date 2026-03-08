/**
 * PUT /api/v1/admin/wowup/:id
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
      ...(body.name !== undefined && { name: body.name }),
      ...(body.string !== undefined && { string: body.string }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.customFields !== undefined && { customFields: typeof body.customFields === 'string' ? body.customFields : JSON.stringify(body.customFields) }),
      updatedAt: new Date(),
    })
    .where(eq(wowupStrings.id, id))
    .returning().get()

  logActivity({ action: 'updated', entityType: 'wowup', entityId: id, entityName: result.name, autoChangelog: true })
  triggerGitHubSync(`wowup-updated: ${result.name}`).catch(() => {})
  return { success: true, data: result }
})
/**
 * PUT /api/v1/admin/wowup/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'
import { validateBody, wowupUpdateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(wowupStrings).where(eq(wowupStrings.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const body = await readBody(event)
  const data = validateBody(wowupUpdateSchema, body)

  const result = db.update(wowupStrings)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.string !== undefined && { string: data.string }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.customFields !== undefined && { customFields: data.customFields }),
      updatedAt: new Date(),
    })
    .where(eq(wowupStrings.id, id))
    .returning().get()

  logActivity({ action: 'updated', entityType: 'wowup', entityId: id, entityName: result.name, autoChangelog: true })
  triggerGitHubSync(`wowup-updated: ${result.name}`).catch(() => {})
  return apiSuccess(result)
})

/**
 * PATCH /api/v1/admin/wowup/:id
 */

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'
import { validateBody } from '~/server/utils/validation'

const wowupToggleSchema = z.object({
  isVisible: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(wowupStrings).where(eq(wowupStrings.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const body = await readBody(event)
  const data = validateBody(wowupToggleSchema, body)

  const result = db.update(wowupStrings)
    .set({
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      updatedAt: new Date(),
    })
    .where(eq(wowupStrings.id, id))
    .returning().get()

  logActivity({ action: 'updated', entityType: 'wowup', entityId: id, entityName: existing.name, details: 'visibility toggled' })
  triggerGitHubSync(`wowup-toggled: ${existing.name}`).catch(() => {})
  return apiSuccess(result)
})

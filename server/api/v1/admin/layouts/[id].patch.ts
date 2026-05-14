/**
 * PATCH /api/v1/admin/layouts/:id
 * Quick toggle (visibility, sort order) without full update.
 */

import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'
import { validateBody } from '~/server/utils/validation'

const layoutToggleSchema = z.object({
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid ID' })
  }

  const existing = db.select().from(characterLayouts).where(eq(characterLayouts.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Layout not found' })
  }

  const body = await readBody(event)
  const data = validateBody(layoutToggleSchema, body)

  const result = db.update(characterLayouts)
    .set({
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      updatedAt: new Date(),
    })
    .where(eq(characterLayouts.id, id))
    .returning()
    .get()

  logActivity({ action: 'updated', entityType: 'layout', entityId: id, entityName: `${existing.className || ''} ${existing.spec || existing.name}`.trim(), details: 'visibility toggled' })
  triggerGitHubSync(`layout-toggled: ${existing.className || ''} ${existing.spec || existing.name}`.trim()).catch(() => {})
  return apiSuccess(result)
})

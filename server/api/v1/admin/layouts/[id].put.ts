/**
 * PUT /api/v1/admin/layouts/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'
import { validateBody, layoutUpdateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(characterLayouts).where(eq(characterLayouts.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const body = await readBody(event)
  const data = validateBody(layoutUpdateSchema, body)

  const result = db.update(characterLayouts)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.className !== undefined && { className: data.className }),
      ...(data.spec !== undefined && { spec: data.spec }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.screenshot !== undefined && { screenshot: data.screenshot }),
      ...(data.importString !== undefined && { importString: data.importString }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      ...(data.customFields !== undefined && { customFields: data.customFields }),
      updatedAt: new Date(),
    })
    .where(eq(characterLayouts.id, id))
    .returning().get()

  logActivity({ action: 'updated', entityType: 'layout', entityId: id, entityName: `${result.className || ''} ${result.spec || result.name}`.trim(), autoChangelog: true })
  triggerGitHubSync(`layout-updated: ${result.className || ''} ${result.spec || result.name}`.trim()).catch(() => {})
  return apiSuccess(result)
})

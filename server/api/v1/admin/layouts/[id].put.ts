/**
 * PUT /api/v1/admin/layouts/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(characterLayouts).where(eq(characterLayouts.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const body = await readBody(event)

  const result = db.update(characterLayouts)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.className !== undefined && { className: body.className }),
      ...(body.spec !== undefined && { spec: body.spec }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.screenshot !== undefined && { screenshot: body.screenshot }),
      ...(body.importString !== undefined && { importString: body.importString }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
      ...(body.customFields !== undefined && { customFields: typeof body.customFields === 'string' ? body.customFields : JSON.stringify(body.customFields) }),
      updatedAt: new Date(),
    })
    .where(eq(characterLayouts.id, id))
    .returning().get()

  logActivity({ action: 'updated', entityType: 'layout', entityId: id, entityName: `${result.className || ''} ${result.spec || result.name}`.trim(), autoChangelog: true })
  triggerGitHubSync(`layout-updated: ${result.className || ''} ${result.spec || result.name}`.trim()).catch(() => {})
  return { success: true, data: result }
})
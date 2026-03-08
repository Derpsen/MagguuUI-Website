/**
 * POST /api/v1/admin/layouts
 */

import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.name) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }

  const result = db.insert(characterLayouts).values({
    name: body.name,
    className: body.className || null,
    spec: body.spec || null,
    description: body.description || null,
    screenshot: body.screenshot || null,
    importString: body.importString || null,
    sortOrder: body.sortOrder ?? 0,
    isVisible: body.isVisible ?? true,
    customFields: body.customFields ? (typeof body.customFields === 'string' ? body.customFields : JSON.stringify(body.customFields)) : null,
  }).returning().get()

  setResponseStatus(event, 201)
  logActivity({ action: 'created', entityType: 'layout', entityId: result.id, entityName: `${body.className || ''} ${body.spec || body.name}`.trim(), autoChangelog: true })
  triggerGitHubSync(`layout-created: ${body.className || ''} ${body.spec || body.name}`.trim()).catch(() => {})
  return { success: true, data: result }})

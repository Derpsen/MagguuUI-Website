/**
 * POST /api/v1/admin/layouts
 */

import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'
import { validateBody, layoutCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(layoutCreateSchema, body)

  const result = db.insert(characterLayouts).values({
    name: data.name,
    className: data.className ?? null,
    spec: data.spec ?? null,
    description: data.description ?? null,
    screenshot: data.screenshot ?? null,
    importString: data.importString ?? null,
    sortOrder: data.sortOrder ?? 0,
    isVisible: data.isVisible ?? true,
    customFields: data.customFields ?? null,
  }).returning().get()

  setResponseStatus(event, 201)
  logActivity({ action: 'created', entityType: 'layout', entityId: result.id, entityName: `${data.className || ''} ${data.spec || data.name}`.trim(), autoChangelog: true })
  triggerGitHubSync(`layout-created: ${data.className || ''} ${data.spec || data.name}`.trim()).catch(() => {})
  return apiSuccess(result)
})

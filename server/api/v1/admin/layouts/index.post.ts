/**
 * POST /api/v1/admin/layouts
 */

import { db, sqlite } from '~/server/database'
import { recordAuditSafe, rowSnapshot } from '~/server/utils/auditLog'
import { characterLayouts } from '~/server/database/schema'
import { validateBody, layoutCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
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
  recordAuditSafe(sqlite, { action: 'created', entityType: 'layout', entityId: result.id, entityName: `${data.className || ''} ${data.spec || data.name}`.trim(), before: null, after: rowSnapshot(result), userId: auth.userId })
  logActivity({ action: 'created', entityType: 'layout', entityId: result.id, entityName: `${data.className || ''} ${data.spec || data.name}`.trim(), autoChangelog: true, userId: auth.userId })
  triggerGitHubSync(`layout-created: ${data.className || ''} ${data.spec || data.name}`.trim()).catch(() => {})
  return apiSuccess(result)
})

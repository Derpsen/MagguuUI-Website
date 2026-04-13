/**
 * POST /api/v1/admin/wowup
 */

import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'
import { validateBody, wowupCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(wowupCreateSchema, body)

  const result = db.insert(wowupStrings).values({
    name: data.name,
    string: data.string,
    description: data.description ?? null,
    sortOrder: data.sortOrder ?? 0,
    isVisible: data.isVisible ?? true,
    customFields: data.customFields ?? null,
  }).returning().get()

  setResponseStatus(event, 201)
  logActivity({ action: 'created', entityType: 'wowup', entityId: result.id, entityName: data.name, autoChangelog: true })
  triggerGitHubSync(`wowup-created: ${data.name}`).catch(() => {})
  return apiSuccess(result)
})

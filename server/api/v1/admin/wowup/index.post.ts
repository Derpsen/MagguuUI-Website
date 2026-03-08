/**
 * POST /api/v1/admin/wowup
 */

import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.name || !body?.string) {
    throw createError({ statusCode: 400, message: 'Name and String are required' })
  }

  const result = db.insert(wowupStrings).values({
    name: body.name,
    string: body.string,
    description: body.description || null,
    sortOrder: body.sortOrder ?? 0,
    isVisible: body.isVisible ?? true,
    customFields: body.customFields ? (typeof body.customFields === 'string' ? body.customFields : JSON.stringify(body.customFields)) : null,
  }).returning().get()

  setResponseStatus(event, 201)
  logActivity({ action: 'created', entityType: 'wowup', entityId: result.id, entityName: body.name, autoChangelog: true })
  triggerGitHubSync(`wowup-created: ${body.name}`).catch(() => {})
  return { success: true, data: result }})

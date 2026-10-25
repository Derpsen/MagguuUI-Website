/**
 * POST /api/v1/admin/changelogs
 */

import { db, sqlite } from '~/server/database'
import { changelogSnapshot, recordAuditSafe } from '~/server/utils/auditLog'
import { changelogs } from '~/server/database/schema'
import { validateBody, changelogCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const body = await readBody(event)
  const data = validateBody(changelogCreateSchema, body)

  const result = db.insert(changelogs).values({
    version: data.version,
    content: data.content,
    contentEn: data.contentEn ?? null,
    isPublished: data.isPublished ?? false,
    publishedAt: data.isPublished ? new Date() : null,
  }).returning().get()

  recordAuditSafe(sqlite, { action: 'created', entityType: 'changelog', entityId: result.id, entityName: result.version, before: null, after: changelogSnapshot(result), userId: auth.userId })
  logActivity({
    action: 'created',
    entityType: 'changelog',
    entityId: result.id,
    entityName: result.version,
    details: { published: result.isPublished },
    userId: auth.userId,
  })

  setResponseStatus(event, 201)
  return apiSuccess(result)
})

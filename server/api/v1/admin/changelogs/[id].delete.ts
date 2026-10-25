/**
 * DELETE /api/v1/admin/changelogs/:id
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { changelogSnapshot, recordAuditSafe } from '~/server/utils/auditLog'
import { changelogs } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(changelogs).where(eq(changelogs.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  db.delete(changelogs).where(eq(changelogs.id, id)).run()

  recordAuditSafe(sqlite, { action: 'deleted', entityType: 'changelog', entityId: id, entityName: existing.version, before: changelogSnapshot(existing), after: null, userId: auth.userId })
  logActivity({
    action: 'deleted',
    entityType: 'changelog',
    entityId: id,
    entityName: existing.version,
    userId: auth.userId,
  })

  return apiSuccess({ id })
})

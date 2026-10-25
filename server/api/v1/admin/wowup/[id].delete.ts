/**
 * DELETE /api/v1/admin/wowup/:id
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { recordAuditSafe, rowSnapshot } from '~/server/utils/auditLog'
import { wowupStrings } from '~/server/database/schema'
import { parseRouteId } from '~/server/utils/adminCrud'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const id = parseRouteId(event)

  const existing = db.select().from(wowupStrings).where(eq(wowupStrings.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  db.delete(wowupStrings).where(eq(wowupStrings.id, id)).run()
  recordAuditSafe(sqlite, { action: 'deleted', entityType: 'wowup', entityId: id, entityName: existing.name, before: rowSnapshot(existing), after: null, userId: auth.userId })
  logActivity({ action: 'deleted', entityType: 'wowup', entityId: id, entityName: existing.name, autoChangelog: true, userId: auth.userId })
  triggerGitHubSync(`wowup-deleted: ${existing.name}`).catch(() => {})
  return apiSuccess({ id })
})

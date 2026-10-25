/**
 * POST /api/v1/admin/audit/:id/undo
 * Restore the before-state of an audit entry (content cells, changelog and FAQ
 * entries only) as a new audited action. 409 when the entity changed since.
 * Admin write: the public-cache plugin clears the route cache afterwards.
 */
import { sqlite } from '~/server/database'
import { AuditUndoError, undoAuditChange } from '~/server/utils/auditLog'
import { parseRouteId } from '~/server/utils/adminCrud'

export default defineEventHandler((event) => {
  const auth = requireAdminAccess(event)
  const id = parseRouteId(event)
  try {
    const entry = undoAuditChange(sqlite, id, auth.userId)
    logActivity({
      action: 'updated',
      entityType: entry.entityType as 'content' | 'changelog' | 'faq',
      entityId: entry.entityId ?? undefined,
      entityName: entry.entityName,
      details: { undoOf: id, auditId: entry.id },
      userId: auth.userId,
    })
    return apiSuccess(entry)
  } catch (e) {
    if (e instanceof AuditUndoError) throw createError({ statusCode: e.status, message: e.message, data: { code: e.code } })
    throw e
  }
})

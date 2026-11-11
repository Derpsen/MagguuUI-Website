/**
 * DELETE /api/v1/admin/news/:id
 */

import { sqlite } from '~/server/database'
import { newsSnapshot, recordAuditSafe } from '~/server/utils/auditLog'
import { deleteNews } from '~/server/utils/newsStore'

export default defineEventHandler((event) => {
  const auth = requireAdminAccess(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = deleteNews(id)
  recordAuditSafe(sqlite, { action: 'deleted', entityType: 'news', entityId: id, entityName: existing.title, before: newsSnapshot(existing), after: null, userId: auth.userId })
  logActivity({
    action: 'deleted',
    entityType: 'news',
    entityId: id,
    entityName: existing.title,
    details: { slug: existing.slug },
    userId: auth.userId,
  })

  return apiSuccess({ deleted: true, id })
})

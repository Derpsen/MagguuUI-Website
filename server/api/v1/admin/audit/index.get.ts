/**
 * GET /api/v1/admin/audit
 * Admin audit log (redacted before/after snapshots), newest first.
 * Query: type, action, actor, search, dateFrom, dateTo, page, limit.
 */
import { sqlite } from '~/server/database'
import { listAudit } from '~/server/utils/auditLog'

export default defineEventHandler((event) => {
  requireAdminAccess(event)
  const q = getQuery(event)
  const str = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 100) : undefined)
  const result = listAudit(sqlite, {
    type: str(q.type),
    action: str(q.action),
    actor: str(q.actor),
    search: str(q.search),
    dateFrom: str(q.dateFrom),
    dateTo: str(q.dateTo),
    page: Number(q.page) || 1,
    limit: Number(q.limit) || 25,
  })
  return apiSuccess(result, { total: result.total, page: result.page, totalPages: result.totalPages })
})

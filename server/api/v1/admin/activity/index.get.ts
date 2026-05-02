/**
 * GET /api/v1/admin/activity
 * Returns activity log entries (newest first), with pagination and filters.
 *
 * Query params:
 *  - page (default 1)
 *  - limit (default 25, max 100)
 *  - action (created|updated|deleted)
 *  - type (profile|wowup|layout|addon|changelog|content|faq|user|api-key|field|setting)
 *  - dateFrom (ISO date string, e.g. "2026-01-01")
 *  - dateTo (ISO date string, e.g. "2026-02-19")
 */

import { desc, eq, and, count, gte, lte } from 'drizzle-orm'
import { db } from '~/server/database'
import { activityLog } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(Number(query.limit) || 25, 100)
  const offset = (page - 1) * limit
  const actionFilter = query.action as string | undefined
  const typeFilter = query.type as string | undefined
  const dateFrom = query.dateFrom as string | undefined
  const dateTo = query.dateTo as string | undefined

  // Mirrors the entityType union in server/utils/activityLog.ts. Anything
  // not listed here is silently dropped instead of returning unfiltered rows.
  const ALLOWED_TYPES = [
    'profile', 'wowup', 'layout', 'addon', 'changelog', 'content',
    'faq', 'user', 'api-key', 'field', 'setting',
  ] as const

  // Build where conditions
  const conditions = []
  if (actionFilter && ['created', 'updated', 'deleted'].includes(actionFilter)) {
    conditions.push(eq(activityLog.action, actionFilter))
  }
  if (typeFilter && (ALLOWED_TYPES as readonly string[]).includes(typeFilter)) {
    conditions.push(eq(activityLog.entityType, typeFilter))
  }
  if (dateFrom) {
    const fromTs = Math.floor(new Date(dateFrom + 'T00:00:00Z').getTime() / 1000)
    if (!isNaN(fromTs)) conditions.push(gte(activityLog.createdAt, new Date(fromTs * 1000)))
  }
  if (dateTo) {
    const toTs = Math.floor(new Date(dateTo + 'T23:59:59Z').getTime() / 1000)
    if (!isNaN(toTs)) conditions.push(lte(activityLog.createdAt, new Date(toTs * 1000)))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  // Get total count
  const totalResult = where
    ? db.select({ count: count() }).from(activityLog).where(where).get()
    : db.select({ count: count() }).from(activityLog).get()
  const total = totalResult?.count ?? 0

  // Get paginated rows
  const baseQuery = db.select().from(activityLog)
  const rows = where
    ? baseQuery.where(where).orderBy(desc(activityLog.createdAt)).limit(limit).offset(offset).all()
    : baseQuery.orderBy(desc(activityLog.createdAt)).limit(limit).offset(offset).all()

  return apiSuccess(
    { items: rows, total, page, totalPages: Math.ceil(total / limit) },
    { total, page, totalPages: Math.ceil(total / limit) },
  )
})

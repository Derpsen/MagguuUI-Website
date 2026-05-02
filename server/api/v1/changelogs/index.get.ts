/**
 * GET /api/v1/changelogs?locale=de|en&limit=50&offset=0
 *
 * Returns published changelog entries, newest first.
 * Bounded list — `limit` capped at 200; auto-generated entries from admin
 * CRUD push the row count up over time, so unbounded responses would slowly
 * inflate this hot SWR-cached payload.
 * If locale=en, uses contentEn (falls back to content if empty).
 */

import { eq, desc, count } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = (query.locale as string) || 'de'
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || DEFAULT_LIMIT))
  const offset = Math.max(0, Number(query.offset) || 0)

  const where = eq(changelogs.isPublished, true)

  const totalRow = db.select({ n: count() }).from(changelogs).where(where).get()
  const total = totalRow?.n ?? 0

  const rows = db
    .select()
    .from(changelogs)
    .where(where)
    .orderBy(desc(changelogs.publishedAt))
    .limit(limit)
    .offset(offset)
    .all()

  const mapped = rows.map(row => ({
    ...row,
    content: locale === 'en' && row.contentEn ? row.contentEn : row.content,
  }))

  return apiSuccess(mapped, { count: mapped.length, total, limit, offset })
})

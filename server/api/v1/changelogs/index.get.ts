/**
 * GET /api/v1/changelogs?locale=de|en
 *
 * Returns published changelog entries, newest first.
 * If locale=en, uses contentEn (falls back to content if empty).
 */

import { eq, desc } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = (query.locale as string) || 'de'

  const rows = db
    .select()
    .from(changelogs)
    .where(eq(changelogs.isPublished, true))
    .orderBy(desc(changelogs.publishedAt))
    .all()

  // Map content based on locale
  const mapped = rows.map(row => ({
    ...row,
    content: locale === 'en' && row.contentEn ? row.contentEn : row.content,
  }))

  return apiSuccess(mapped, { count: mapped.length })
})

/**
 * GET /api/v1/faqs
 *
 * Returns visible FAQ entries grouped by category.
 */

import { eq, asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { faqs } from '~/server/database/schema'
import { sanitizeRichHtml } from '~/utils/richText'

export default defineEventHandler(async () => {
  const rows = db
    .select()
    .from(faqs)
    .where(eq(faqs.isVisible, true))
    .orderBy(asc(faqs.sortOrder), asc(faqs.id))
    .all()

  // Group by category
  const grouped: Record<string, typeof rows> = {}
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = []
    grouped[row.category].push({
      ...row,
      answer: sanitizeRichHtml(row.answer),
    })
  }

  return apiSuccess(grouped, { count: rows.length })
})

/**
 * GET /api/v1/content/:page
 *
 * Returns content blocks for a page, grouped by section.
 * Defaults to 'en'. Falls back to 'de' if requested locale content doesn't exist.
 */

import { eq, and, asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { siteContent } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const page = getRouterParam(event, 'page')
  if (!page) return apiError('MISSING_PARAM', 'Page parameter required')

  const query = getQuery(event)
  const locale = (query.locale as string) || 'en'

  // Get requested locale
  const rows = db.select().from(siteContent)
    .where(and(eq(siteContent.page, page), eq(siteContent.locale, locale)))
    .orderBy(asc(siteContent.sortOrder))
    .all()

  // Fallback to 'de' for missing keys (backward compat with old content)
  let fallbackRows: typeof rows = []
  if (locale !== 'de') {
    fallbackRows = db.select().from(siteContent)
      .where(and(eq(siteContent.page, page), eq(siteContent.locale, 'de')))
      .orderBy(asc(siteContent.sortOrder))
      .all()
  }

  // Merge: use locale content, fall back to 'de' for missing keys
  const keySet = new Set(rows.map(r => `${r.section}::${r.key}`))
  const merged = [...rows]
  for (const fb of fallbackRows) {
    if (!keySet.has(`${fb.section}::${fb.key}`)) {
      merged.push(fb)
    }
  }

  // Group by section
  const grouped: Record<string, Record<string, string>> = {}
  for (const row of merged) {
    if (!grouped[row.section]) grouped[row.section] = {}
    grouped[row.section][row.key] = row.value
  }

  return apiSuccess(grouped)
})

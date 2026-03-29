/**
 * GET /api/v1/content/:page
 *
 * Returns content blocks for a page, grouped by section.
 * Defaults to 'en'. Falls back to 'de' if requested locale content doesn't exist.
 */

import { eq, and, asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { siteContent } from '~/server/database/schema'
import { getContentLocaleChain, normalizeContentLocale } from '~/server/utils/contentLocales'

export default defineEventHandler(async (event) => {
  const page = getRouterParam(event, 'page')
  if (!page) return apiError('MISSING_PARAM', 'Page parameter required')

  const query = getQuery(event)
  const localeChain = getContentLocaleChain(normalizeContentLocale(query.locale as string | undefined))
  const merged: Array<typeof siteContent.$inferSelect> = []
  const keySet = new Set<string>()

  for (const locale of localeChain) {
    const rows = db.select().from(siteContent)
      .where(and(eq(siteContent.page, page), eq(siteContent.locale, locale)))
      .orderBy(asc(siteContent.sortOrder))
      .all()

    for (const row of rows) {
      const key = `${row.section}::${row.key}`
      if (keySet.has(key)) continue
      keySet.add(key)
      merged.push(row)
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

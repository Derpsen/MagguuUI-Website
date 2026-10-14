/**
 * GET /api/v1/search-index — public Ctrl+K index (Guide, FAQ, Strings).
 * Built from the live DB, SWR-cached (routeRules) and cleared on admin writes,
 * so edits are searchable without a rebuild. Loaded only when search opens.
 */

import { and, asc, eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { faqs, siteContent } from '~/server/database/schema'
import { readGroupedProfileIndex, readPublicLayoutIndex, readWowUpIndex } from '~/server/utils/profileReadModels'
import { buildSearchIndex } from '~/server/utils/searchIndex'

export default defineEventHandler(() => {
  const guideSteps: Record<string, string> = {}
  for (const row of db.select({ key: siteContent.key, value: siteContent.value }).from(siteContent)
    .where(and(eq(siteContent.page, 'guide'), eq(siteContent.section, 'steps'), eq(siteContent.locale, 'en'))).all()) {
    guideSteps[row.key] = row.value
  }
  const faqRows = db.select({ id: faqs.id, question: faqs.question, answer: faqs.answer }).from(faqs)
    .where(eq(faqs.isVisible, true)).orderBy(asc(faqs.sortOrder), asc(faqs.id)).all()
  const profiles = Object.entries(readGroupedProfileIndex().data)
    .flatMap(([addon, rows]) => rows.map(r => ({ id: r.id, addon, profile: r.profile })))
  return apiSuccess(buildSearchIndex({
    guideSteps,
    faqs: faqRows,
    profiles,
    layouts: readPublicLayoutIndex(),
    wowupPacks: Object.keys(readWowUpIndex().data),
  }))
})

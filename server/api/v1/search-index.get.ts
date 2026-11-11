/**
 * GET /api/v1/search-index — public Ctrl+K index (Guide, Changelog, FAQ, News, Strings).
 * Built from the live DB, SWR-cached (routeRules) and cleared on admin writes,
 * so edits are searchable without a rebuild. Loaded only when search opens.
 */

import { and, asc, desc, eq, like } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs, faqs, newsArticles, siteContent } from '~/server/database/schema'
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
  // Same visibility as /api/v1/changelogs: published vX.Y.Z only, never Unreleased.
  const releases = db.select({ version: changelogs.version, content: changelogs.content, contentEn: changelogs.contentEn }).from(changelogs)
    .where(and(eq(changelogs.isPublished, true), like(changelogs.version, 'v%')))
    .orderBy(desc(changelogs.publishedAt)).limit(24).all()
    .map(r => ({ version: r.version, content: r.contentEn || r.content }))
  const news = db.select({
    slug: newsArticles.slug,
    title: newsArticles.title,
    summary: newsArticles.summary,
    body: newsArticles.body,
  }).from(newsArticles)
    .where(eq(newsArticles.isPublished, true))
    .orderBy(desc(newsArticles.publishedAt), desc(newsArticles.id))
    .all()
  const profiles = Object.entries(readGroupedProfileIndex().data)
    .flatMap(([addon, rows]) => rows.map(r => ({ id: r.id, addon, profile: r.profile })))
  return apiSuccess(buildSearchIndex({
    guideSteps,
    faqs: faqRows,
    changelog: releases,
    news,
    profiles,
    layouts: readPublicLayoutIndex(),
    wowupPacks: Object.keys(readWowUpIndex().data),
  }))
})

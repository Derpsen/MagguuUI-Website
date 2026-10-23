/**
 * GET /api/v1/admin/content/revisions?page=home[&page=about]
 * Newest 100 revisions (previous values) per request, with the current value.
 */

import { and, desc, eq, inArray } from 'drizzle-orm'
import { db } from '~/server/database'
import { contentRevisions, siteContent, users } from '~/server/database/schema'

export default defineEventHandler((event) => {
  requireAdminAccess(event)
  const raw = getQuery(event).page
  const pages = (Array.isArray(raw) ? raw : [raw]).filter((p): p is string => typeof p === 'string' && /^[\w-]{1,40}$/.test(p))
  if (pages.length === 0) throw createError({ statusCode: 400, message: 'page is required' })

  const rows = db.select({
    id: contentRevisions.id,
    page: contentRevisions.page,
    section: contentRevisions.section,
    key: contentRevisions.key,
    locale: contentRevisions.locale,
    value: contentRevisions.value,
    createdAt: contentRevisions.createdAt,
    username: users.username,
  }).from(contentRevisions)
    .leftJoin(users, eq(users.id, contentRevisions.userId))
    .where(inArray(contentRevisions.page, pages))
    .orderBy(desc(contentRevisions.id))
    .limit(100)
    .all()

  const withCurrent = rows.map((r) => {
    const current = db.select({ value: siteContent.value }).from(siteContent).where(and(
      eq(siteContent.page, r.page),
      eq(siteContent.section, r.section),
      eq(siteContent.key, r.key),
      eq(siteContent.locale, r.locale),
    )).get()
    return { ...r, current: current?.value ?? null }
  })
  return apiSuccess(withCurrent)
})

/**
 * GET /api/v1/changelogs?locale=de|en
 *
 * Public feed: the latest published MagguuUI version only.
 * Full history stays on GitHub CHANGELOG.md and in admin (/api/v1/admin/changelogs).
 * Query limit/offset are accepted for compatibility but ignored.
 */

import { and, desc, eq, like } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = (query.locale as string) || 'de'

  const where = and(
    eq(changelogs.isPublished, true),
    like(changelogs.version, 'v%'),
  )

  const latest = db
    .select()
    .from(changelogs)
    .where(where)
    .orderBy(desc(changelogs.publishedAt))
    .limit(1)
    .get()

  const mapped = latest
    ? [{
        ...latest,
        content: locale === 'en' && latest.contentEn ? latest.contentEn : latest.content,
      }]
    : []

  return apiSuccess(mapped, { count: mapped.length, total: mapped.length, limit: 1, offset: 0 })
})

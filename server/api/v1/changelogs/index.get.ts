/**
 * GET /api/v1/changelogs?locale=de|en
 *
 * Public feed: published MagguuUI versions, newest first. `data[0]` is the
 * current release; notes not released yet come separately as `meta.unreleased`.
 * GitHub CHANGELOG.md stays the full archive. Query limit/offset are ignored.
 */

import { and, desc, eq, like } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'
import { UNRELEASED_CHANGELOG_VERSION } from '~/server/utils/parseAddonChangelog'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const locale = (query.locale as string) || 'de'

  const where = and(
    eq(changelogs.isPublished, true),
    like(changelogs.version, 'v%'),
  )

  const rows = db
    .select()
    .from(changelogs)
    .where(where)
    .orderBy(desc(changelogs.publishedAt))
    .limit(24)
    .all()

  const mapped = rows.map(row => ({
    ...row,
    content: locale === 'en' && row.contentEn ? row.contentEn : row.content,
  }))

  const pending = db.select().from(changelogs)
    .where(and(eq(changelogs.isPublished, true), eq(changelogs.version, UNRELEASED_CHANGELOG_VERSION)))
    .get()
  const unreleased = pending
    ? { id: pending.id, version: pending.version, content: locale === 'en' && pending.contentEn ? pending.contentEn : pending.content }
    : null

  return apiSuccess(mapped, { count: mapped.length, total: mapped.length, limit: 24, offset: 0, unreleased })
})

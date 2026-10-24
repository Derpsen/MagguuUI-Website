/**
 * GET /api/v1/release-stamps
 *
 * Tiny public list of published MagguuUI releases (version + publish time,
 * newest first). The Strings page uses it to stamp each import string with the
 * release that was current when the string was last updated. Same visibility
 * rule as /api/v1/changelogs: published `vX.Y.Z` rows only, never Unreleased.
 */

import { and, desc, eq, like } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'

export default defineEventHandler(() => {
  const rows = db
    .select({ version: changelogs.version, publishedAt: changelogs.publishedAt })
    .from(changelogs)
    .where(and(eq(changelogs.isPublished, true), like(changelogs.version, 'v%')))
    .orderBy(desc(changelogs.publishedAt))
    .limit(100)
    .all()
  return apiSuccess(rows, { count: rows.length })
})

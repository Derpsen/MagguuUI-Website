import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { and, desc, eq, like, ne } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'
import { UNRELEASED_CHANGELOG_VERSION } from '~/server/utils/parseAddonChangelog'
import { buildAtom, buildRss, type FeedEntry } from '~/server/utils/changelogFeed'

const FEED_LIMIT = 20

/** Published, released notes only: Unreleased and drafts never reach a feed. */
function loadFeedEntries(): FeedEntry[] {
  return db.select().from(changelogs)
    .where(and(
      eq(changelogs.isPublished, true),
      like(changelogs.version, 'v%'),
      ne(changelogs.version, UNRELEASED_CHANGELOG_VERSION),
    ))
    .orderBy(desc(changelogs.publishedAt))
    .limit(FEED_LIMIT)
    .all()
    .map(row => ({
      id: row.id,
      version: row.version,
      content: row.contentEn || row.content,
      publishedAt: row.publishedAt,
    }))
}

export function serveChangelogFeed(event: H3Event, kind: 'rss' | 'atom') {
  const entries = loadFeedEntries()
  const body = kind === 'rss' ? buildRss(entries) : buildAtom(entries)
  const etag = `"${createHash('sha1').update(body).digest('hex').slice(0, 20)}"`

  setResponseHeader(event, 'Content-Type', kind === 'rss' ? 'application/rss+xml; charset=utf-8' : 'application/atom+xml; charset=utf-8')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  // 10 min cache, serve stale for an hour while revalidating. Deliberately no
  // `maxAge` option (h3 would add s-maxage, which public-cache-invalidate.ts
  // rewrites to a browser revalidate) and no Last-Modified (that plugin drops
  // it); the ETag alone drives revalidation.
  const notModified = handleCacheHeaders(event, {
    etag,
    cacheControls: ['max-age=600', 'stale-while-revalidate=3600'],
  })
  if (notModified) return null
  return body
}

import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'
import { listPublishedNews } from './newsStore'
import { buildNewsRss } from './newsFeed'

function etagFor(body: string): string {
  return `"${createHash('sha256').update(body).digest('hex')}"`
}

/** GET /news/feed.xml: RSS 2.0 of published news articles. */
export function serveNewsFeed(event: H3Event) {
  const body = buildNewsRss(listPublishedNews())
  const etag = etagFor(body)
  setResponseHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  const notModified = handleCacheHeaders(event, {
    etag,
    cacheControls: ['max-age=600', 'stale-while-revalidate=3600'],
  })
  if (notModified) return null
  return body
}

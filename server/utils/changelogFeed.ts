/**
 * RSS 2.0 and Atom 1.0 builders for the public changelog. Pure (no DB) so the
 * output is unit tested. Callers pass published, released entries only.
 */
import { renderMarkdownToSafeHtml } from '~/utils/richText'
import { publicAnchorId } from '~/utils/publicAnchor'

export const FEED_SITE_URL = 'https://ui.magguu.xyz'
export const FEED_TITLE = 'MagguuUI release notes'
export const FEED_DESCRIPTION = 'Release notes for the MagguuUI addon, newest first.'

export interface FeedEntry {
  id: number
  version: string
  content: string
  publishedAt: Date | number | string | null
}

/** Escape text for XML and drop characters that are illegal in XML 1.0. */
export function escapeXml(value: string): string {
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toDate(value: FeedEntry['publishedAt']): Date | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function entryUrl(entry: FeedEntry): string {
  return `${FEED_SITE_URL}/changelog#${publicAnchorId('release', entry.version)}`
}

function entryHtml(entry: FeedEntry): string {
  return renderMarkdownToSafeHtml(entry.content, { stripChangelogDateHeaders: true })
}

function entryGuid(entry: FeedEntry): string {
  return `${FEED_SITE_URL}/changelog#${publicAnchorId('release', entry.version)}`
}

/** Newest entry date (feed-level updated / lastBuildDate); epoch when empty. */
export function feedUpdated(entries: FeedEntry[]): Date {
  let best = 0
  for (const entry of entries) {
    const d = toDate(entry.publishedAt)
    if (d && d.getTime() > best) best = d.getTime()
  }
  return new Date(best)
}

export function buildRss(entries: FeedEntry[]): string {
  const items = entries.map((entry) => {
    const date = toDate(entry.publishedAt)
    return [
      '    <item>',
      `      <title>${escapeXml(`MagguuUI ${entry.version}`)}</title>`,
      `      <link>${escapeXml(entryUrl(entry))}</link>`,
      `      <guid isPermaLink="false">${escapeXml(entryGuid(entry))}</guid>`,
      date ? `      <pubDate>${date.toUTCString()}</pubDate>` : '',
      `      <description>${escapeXml(entryHtml(entry))}</description>`,
      '    </item>',
    ].filter(Boolean).join('\n')
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${FEED_SITE_URL}/changelog</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${feedUpdated(entries).toUTCString()}</lastBuildDate>
    <atom:link href="${FEED_SITE_URL}/changelog/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`
}

export function buildAtom(entries: FeedEntry[]): string {
  const items = entries.map((entry) => {
    const date = toDate(entry.publishedAt) ?? new Date(0)
    return [
      '  <entry>',
      `    <id>${escapeXml(entryGuid(entry))}</id>`,
      `    <title>${escapeXml(`MagguuUI ${entry.version}`)}</title>`,
      `    <link rel="alternate" type="text/html" href="${escapeXml(entryUrl(entry))}" />`,
      `    <updated>${date.toISOString()}</updated>`,
      `    <content type="html">${escapeXml(entryHtml(entry))}</content>`,
      '  </entry>',
    ].join('\n')
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
  <id>${FEED_SITE_URL}/changelog</id>
  <title>${escapeXml(FEED_TITLE)}</title>
  <subtitle>${escapeXml(FEED_DESCRIPTION)}</subtitle>
  <updated>${feedUpdated(entries).toISOString()}</updated>
  <link rel="alternate" type="text/html" href="${FEED_SITE_URL}/changelog" />
  <link rel="self" type="application/atom+xml" href="${FEED_SITE_URL}/changelog/atom.xml" />
  <author><name>MagguuUI</name></author>
${items}
</feed>
`
}

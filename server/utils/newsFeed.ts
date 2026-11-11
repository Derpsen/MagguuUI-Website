/**
 * RSS 2.0 builder for published news articles. Pure (no DB) so the output
 * is unit tested. Callers pass published entries only.
 */
import { renderMarkdownToSafeHtml } from '~/utils/richText'
import { escapeXml, FEED_SITE_URL } from './changelogFeed'

export const NEWS_FEED_TITLE = 'MagguuUI news'
export const NEWS_FEED_DESCRIPTION = 'Magguu notes on World of Warcraft patches, Forever, and the addon.'

export type NewsFeedEntry = {
  slug: string
  title: string
  summary: string
  body: string
  publishedAt: number
  author: string
}

function toDate(seconds: number): Date {
  return new Date(seconds * 1000)
}

export function newsEntryUrl(entry: NewsFeedEntry): string {
  return `${FEED_SITE_URL}/news/${entry.slug}`
}

export function newsFeedUpdated(entries: NewsFeedEntry[]): Date {
  let best = 0
  for (const entry of entries) {
    if (entry.publishedAt * 1000 > best) best = entry.publishedAt * 1000
  }
  return new Date(best)
}

export function buildNewsRss(entries: NewsFeedEntry[]): string {
  const items = entries.map((entry) => {
    const date = toDate(entry.publishedAt)
    const html = renderMarkdownToSafeHtml(entry.body)
    return [
      '    <item>',
      `      <title>${escapeXml(entry.title)}</title>`,
      `      <link>${escapeXml(newsEntryUrl(entry))}</link>`,
      `      <guid isPermaLink="true">${escapeXml(newsEntryUrl(entry))}</guid>`,
      `      <pubDate>${date.toUTCString()}</pubDate>`,
      `      <author>${escapeXml(entry.author)}</author>`,
      `      <description>${escapeXml(html)}</description>`,
      '    </item>',
    ].join('\n')
  }).join('\n')

  const updated = newsFeedUpdated(entries)
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(NEWS_FEED_TITLE)}</title>
    <link>${FEED_SITE_URL}/news</link>
    <description>${escapeXml(NEWS_FEED_DESCRIPTION)}</description>
    <language>en</language>
    <lastBuildDate>${updated.toUTCString()}</lastBuildDate>
    <atom:link href="${FEED_SITE_URL}/news/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`
}

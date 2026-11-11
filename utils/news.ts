/**
 * News article contract (SQLite rows and public /news API).
 * Author is always Magguu. Summary is at most 160 characters.
 */

export const NEWS_AUTHOR = 'Magguu'
export const NEWS_SUMMARY_MAX = 160
export const NEWS_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** Time-sensitive seed that must not go live after 2026-11-13 01:30 Europe/Berlin. */
export const NEWS_UNPUBLISHED_SEED_SLUG = 'pouch-of-violet-dust-launch-celebration'

export type NewsArticle = {
  id: number
  slug: string
  title: string
  summary: string
  body: string
  sourceUrl: string | null
  sourceName: string | null
  publishedAt: number
  author: typeof NEWS_AUTHOR
  tags: string[]
  isPublished: boolean
}

export type NewsArticleListItem = Omit<NewsArticle, 'body'>

export function isNewsSlug(value: string): boolean {
  return NEWS_SLUG_PATTERN.test(value) && value.length <= 120
}

export function parseNewsTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map(item => String(item).trim().toLowerCase()).filter(Boolean))]
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      return parseNewsTags(JSON.parse(raw))
    } catch {
      return [...new Set(raw.split(',').map(item => item.trim().toLowerCase()).filter(Boolean))]
    }
  }
  return []
}

export function sourceNameFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'news.blizzard.com' || host.endsWith('.blizzard.com') || host === 'blizzard.com') return 'Blizzard News'
    if (host.endsWith('wowhead.com')) return 'Wowhead'
    if (host.endsWith('icy-veins.com')) return 'Icy Veins'
    return host || 'Source'
  } catch {
    return 'Source'
  }
}

export function publishedAtFromDate(value: string | number | Date): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value)
  }
  const date = value instanceof Date ? value : new Date(`${String(value).trim()}T00:00:00.000Z`)
  const ms = date.getTime()
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000)
}

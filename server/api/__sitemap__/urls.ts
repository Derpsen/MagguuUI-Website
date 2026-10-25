/**
 * Sitemap source for @nuxtjs/sitemap (replaces the hand-written
 * server/routes/sitemap.xml.ts). Page discovery from the router is switched off
 * in nuxt.config (`excludeAppSources: true`), so this list is the whole sitemap:
 * public pages only, never /admin, /api or the changelog feeds. Changelog
 * query variants (?since=, ?q=) are filters of /changelog, not separate pages,
 * and are never listed.
 *
 * The site is English only, so there is no per-language variant; when i18n
 * lands this is where alternates get added.
 */
import { desc, eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'

const PAGES = [
  { loc: '/', changefreq: 'weekly', priority: 1.0, lastmodFromChangelog: true },
  { loc: '/strings', changefreq: 'daily', priority: 0.9 },
  { loc: '/guide', changefreq: 'monthly', priority: 0.7 },
  { loc: '/addons', changefreq: 'monthly', priority: 0.7 },
  { loc: '/profiles', changefreq: 'monthly', priority: 0.6 },
  { loc: '/changelog', changefreq: 'weekly', priority: 0.6, lastmodFromChangelog: true },
  { loc: '/faq', changefreq: 'monthly', priority: 0.5 },
  { loc: '/about', changefreq: 'monthly', priority: 0.3 },
  { loc: '/imprint', changefreq: 'yearly', priority: 0.2 },
  { loc: '/privacy', changefreq: 'yearly', priority: 0.2 },
] as const

function toDate(value: Date | number | string): Date {
  if (value instanceof Date) return value
  if (typeof value === 'number') return new Date(value * 1000)
  return new Date(value)
}

export default defineSitemapEventHandler(() => {
  let lastmod: string | undefined
  try {
    const latest = db.select({ publishedAt: changelogs.publishedAt })
      .from(changelogs)
      .where(eq(changelogs.isPublished, true))
      .orderBy(desc(changelogs.publishedAt))
      .limit(1)
      .get()
    if (latest?.publishedAt) lastmod = toDate(latest.publishedAt).toISOString().slice(0, 10)
  } catch {
    // DB not ready: serve the sitemap without lastmod.
  }

  return PAGES.map(page => ({
    loc: page.loc,
    changefreq: page.changefreq,
    priority: page.priority,
    ...('lastmodFromChangelog' in page && lastmod ? { lastmod } : {}),
  }))
})

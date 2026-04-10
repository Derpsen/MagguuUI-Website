/**
 * Dynamic sitemap.xml
 *
 * Generates sitemap from static pages + dynamic changelog entries.
 * Replaces the static public/sitemap.xml.
 */

import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'
import { desc, eq } from 'drizzle-orm'

const SITE_URL = 'https://ui.magguu.xyz'

interface SitemapEntry {
  loc: string
  changefreq: string
  priority: string
  lastmod?: string
}

export default defineEventHandler((event) => {
  const staticPages: SitemapEntry[] = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/strings', changefreq: 'daily', priority: '0.9' },
    { loc: '/guide', changefreq: 'monthly', priority: '0.7' },
    { loc: '/addons', changefreq: 'monthly', priority: '0.7' },
    { loc: '/changelog', changefreq: 'weekly', priority: '0.6' },
    { loc: '/faq', changefreq: 'monthly', priority: '0.5' },
    { loc: '/about', changefreq: 'monthly', priority: '0.3' },
    { loc: '/imprint', changefreq: 'yearly', priority: '0.2' },
    { loc: '/privacy', changefreq: 'yearly', priority: '0.2' },
  ]

  // Add lastmod from latest changelog to relevant pages
  try {
    const latest = db.select({ publishedAt: changelogs.publishedAt })
      .from(changelogs)
      .where(eq(changelogs.isPublished, true))
      .orderBy(desc(changelogs.publishedAt))
      .limit(1)
      .get()

    if (latest?.publishedAt) {
      const lastmod = new Date((latest.publishedAt as number) * 1000).toISOString().split('T')[0]
      const homeEntry = staticPages.find(p => p.loc === '/')
      if (homeEntry) homeEntry.lastmod = lastmod
      const changelogEntry = staticPages.find(p => p.loc === '/changelog')
      if (changelogEntry) changelogEntry.lastmod = lastmod
    }
  } catch {
    // DB not ready — serve sitemap without lastmod
  }

  const urls = staticPages.map(page => {
    const lastmodTag = page.lastmod ? `\n    <lastmod>${page.lastmod}</lastmod>` : ''
    return `  <url>
    <loc>${SITE_URL}${page.loc}</loc>${lastmodTag}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600')
  return xml
})

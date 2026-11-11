/**
 * First-run seed of Buddy news fixtures. Inserts a slug only once —
 * never overwrites admin edits, and never brings back a deleted slug
 * (see news_seed_markers).
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { WebsiteBootDb } from './websiteBootTypes'
import { newsArticles, newsSeedMarkers } from '~/server/database/schema'
import { parseNewsMarkdown } from '~/utils/newsMarkdown'
import { NEWS_AUTHOR, isHttpUrl } from '~/utils/news'

export const DEFAULT_NEWS_SEED_DIR = join(process.cwd(), 'server/database/news-seed')

export function loadNewsSeedArticles(dir = DEFAULT_NEWS_SEED_DIR) {
  let names: string[]
  try {
    names = readdirSync(dir).filter(name => name.endsWith('.md') && name !== 'README.md').sort()
  } catch {
    return []
  }
  const articles = []
  for (const name of names) {
    const parsed = parseNewsMarkdown(readFileSync(join(dir, name), 'utf8'))
    if (parsed) articles.push(parsed)
  }
  return articles
}

export function recordNewsSeedMarker(db: WebsiteBootDb, slug: string): void {
  db.insert(newsSeedMarkers).values({ slug }).onConflictDoNothing().run()
}

export function seedNewsArticlesIfMissing(db: WebsiteBootDb, dir = DEFAULT_NEWS_SEED_DIR): number {
  const existing = new Set(db.select({ slug: newsArticles.slug }).from(newsArticles).all().map(row => row.slug))
  const remembered = new Set(db.select({ slug: newsSeedMarkers.slug }).from(newsSeedMarkers).all().map(row => row.slug))
  let inserted = 0
  for (const article of loadNewsSeedArticles(dir)) {
    if (existing.has(article.slug) || remembered.has(article.slug)) {
      recordNewsSeedMarker(db, article.slug)
      continue
    }
    const sourceUrl = article.sourceUrl && isHttpUrl(article.sourceUrl) ? article.sourceUrl : null
    db.insert(newsArticles).values({
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      body: article.body,
      sourceUrl,
      sourceName: sourceUrl ? article.sourceName : null,
      publishedAt: article.publishedAt,
      author: NEWS_AUTHOR,
      tags: JSON.stringify(article.tags),
      isPublished: article.isPublished,
    }).run()
    recordNewsSeedMarker(db, article.slug)
    existing.add(article.slug)
    remembered.add(article.slug)
    inserted++
  }
  if (inserted > 0) {
    console.log(`[Init] Seeded ${inserted} news article${inserted === 1 ? '' : 's'}`)
  }
  return inserted
}

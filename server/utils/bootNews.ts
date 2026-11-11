/**
 * First-run seed of Buddy news fixtures. Inserts missing slugs only —
 * never overwrites admin edits.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { WebsiteBootDb } from './websiteBootTypes'
import { newsArticles } from '~/server/database/schema'
import { parseNewsMarkdown } from '~/utils/newsMarkdown'
import { NEWS_AUTHOR } from '~/utils/news'

export const DEFAULT_NEWS_SEED_DIR = join(process.cwd(), 'server/database/news-seed')

export function loadNewsSeedArticles(dir = DEFAULT_NEWS_SEED_DIR) {
  let names: string[]
  try {
    names = readdirSync(dir).filter(name => name.endsWith('.md')).sort()
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

export function seedNewsArticlesIfMissing(db: WebsiteBootDb, dir = DEFAULT_NEWS_SEED_DIR): number {
  const existing = new Set(db.select({ slug: newsArticles.slug }).from(newsArticles).all().map(row => row.slug))
  let inserted = 0
  for (const article of loadNewsSeedArticles(dir)) {
    if (existing.has(article.slug)) continue
    db.insert(newsArticles).values({
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      body: article.body,
      sourceUrl: article.sourceUrl,
      sourceName: article.sourceName,
      publishedAt: article.publishedAt,
      author: NEWS_AUTHOR,
      tags: JSON.stringify(article.tags),
      isPublished: article.isPublished,
    }).run()
    existing.add(article.slug)
    inserted++
  }
  if (inserted > 0) {
    console.log(`[Init] Seeded ${inserted} news article${inserted === 1 ? '' : 's'}`)
  }
  return inserted
}

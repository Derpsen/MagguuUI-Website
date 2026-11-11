/**
 * News article CRUD and public listing. Author is always Magguu.
 */

import { desc, eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { newsArticles } from '~/server/database/schema'
import { NEWS_AUTHOR, type NewsArticle, type NewsArticleListItem, parseNewsTags, sourceNameFromUrl } from '~/utils/news'

export type NewsRow = typeof newsArticles.$inferSelect

export type NewsWriteInput = {
  slug: string
  title: string
  summary: string
  body: string
  sourceUrl?: string | null
  sourceName?: string | null
  publishedAt: number
  tags?: string[]
  isPublished: boolean
}

function normalizeSource(sourceUrl: string | null | undefined, sourceName: string | null | undefined): { sourceUrl: string | null, sourceName: string | null } {
  const url = sourceUrl?.trim() || null
  const name = sourceName?.trim() || (url ? sourceNameFromUrl(url) : null)
  return { sourceUrl: url, sourceName: name }
}

export function toNewsArticle(row: NewsRow): NewsArticle {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    sourceUrl: row.sourceUrl,
    sourceName: row.sourceName,
    publishedAt: row.publishedAt,
    author: NEWS_AUTHOR,
    tags: parseNewsTags(row.tags),
    isPublished: Boolean(row.isPublished),
  }
}

export function toNewsListItem(article: NewsArticle): NewsArticleListItem {
  const { body: _body, ...rest } = article
  return rest
}

export function listPublishedNews(): NewsArticle[] {
  return db.select().from(newsArticles)
    .where(eq(newsArticles.isPublished, true))
    .orderBy(desc(newsArticles.publishedAt), desc(newsArticles.id))
    .all()
    .map(toNewsArticle)
}

export function listAllNews(): NewsArticle[] {
  return db.select().from(newsArticles)
    .orderBy(desc(newsArticles.publishedAt), desc(newsArticles.id))
    .all()
    .map(toNewsArticle)
}

export function getPublishedNewsBySlug(slug: string): NewsArticle | null {
  const row = db.select().from(newsArticles).where(eq(newsArticles.slug, slug)).get()
  if (!row || !row.isPublished) return null
  return toNewsArticle(row)
}

export function getNewsById(id: number): NewsArticle | null {
  const row = db.select().from(newsArticles).where(eq(newsArticles.id, id)).get()
  return row ? toNewsArticle(row) : null
}

export function getNewsBySlug(slug: string): NewsArticle | null {
  const row = db.select().from(newsArticles).where(eq(newsArticles.slug, slug)).get()
  return row ? toNewsArticle(row) : null
}

function isUniqueConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /UNIQUE|unique/i.test(message)
}

export function createNews(input: NewsWriteInput): NewsArticle {
  const source = normalizeSource(input.sourceUrl, input.sourceName)
  try {
    const row = db.insert(newsArticles).values({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      body: input.body,
      sourceUrl: source.sourceUrl,
      sourceName: source.sourceName,
      publishedAt: input.publishedAt,
      author: NEWS_AUTHOR,
      tags: JSON.stringify(input.tags ?? []),
      isPublished: input.isPublished,
    }).returning().get()
    return toNewsArticle(row)
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw createError({ statusCode: 409, message: 'A news article with that slug already exists.' })
    }
    throw error
  }
}

export function updateNews(id: number, input: Partial<NewsWriteInput>): NewsArticle {
  const existing = db.select().from(newsArticles).where(eq(newsArticles.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })
  const source = normalizeSource(
    input.sourceUrl !== undefined ? input.sourceUrl : existing.sourceUrl,
    input.sourceName !== undefined ? input.sourceName : existing.sourceName,
  )
  try {
    const row = db.update(newsArticles).set({
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.body !== undefined && { body: input.body }),
      ...(input.sourceUrl !== undefined || input.sourceName !== undefined
        ? { sourceUrl: source.sourceUrl, sourceName: source.sourceName }
        : {}),
      ...(input.publishedAt !== undefined && { publishedAt: input.publishedAt }),
      ...(input.tags !== undefined && { tags: JSON.stringify(input.tags) }),
      ...(input.isPublished !== undefined && { isPublished: input.isPublished }),
      author: NEWS_AUTHOR,
      updatedAt: new Date(),
    }).where(eq(newsArticles.id, id)).returning().get()
    return toNewsArticle(row)
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw createError({ statusCode: 409, message: 'A news article with that slug already exists.' })
    }
    throw error
  }
}

export function deleteNews(id: number): NewsArticle {
  const existing = getNewsById(id)
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })
  db.delete(newsArticles).where(eq(newsArticles.id, id)).run()
  return existing
}

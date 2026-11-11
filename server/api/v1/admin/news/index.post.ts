/**
 * POST /api/v1/admin/news
 */

import { sqlite } from '~/server/database'
import { newsSnapshot, recordAuditSafe } from '~/server/utils/auditLog'
import { createNews } from '~/server/utils/newsStore'
import { validateBody, newsCreateSchema } from '~/server/utils/validation'
import { NEWS_AUTHOR, parseNewsTags } from '~/utils/news'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const data = validateBody(newsCreateSchema, await readBody(event))
  const result = createNews({
    slug: data.slug,
    title: data.title,
    summary: data.summary,
    body: data.body,
    sourceUrl: data.sourceUrl ?? null,
    sourceName: data.sourceName ?? null,
    publishedAt: data.publishedAt,
    tags: parseNewsTags(data.tags ?? []),
    isPublished: data.isPublished ?? false,
  })

  const row = { ...result, author: NEWS_AUTHOR }
  recordAuditSafe(sqlite, { action: 'created', entityType: 'news', entityId: result.id, entityName: result.title, before: null, after: newsSnapshot(row), userId: auth.userId })
  logActivity({
    action: 'created',
    entityType: 'news',
    entityId: result.id,
    entityName: result.title,
    details: { slug: result.slug, published: result.isPublished },
    userId: auth.userId,
  })

  setResponseStatus(event, 201)
  return apiSuccess(result)
})

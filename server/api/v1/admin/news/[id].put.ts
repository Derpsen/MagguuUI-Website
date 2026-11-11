/**
 * PUT /api/v1/admin/news/:id
 */

import { sqlite } from '~/server/database'
import { newsSnapshot, recordAuditSafe } from '~/server/utils/auditLog'
import { getNewsById, updateNews } from '~/server/utils/newsStore'
import { validateBody, newsUpdateSchema } from '~/server/utils/validation'
import { parseNewsTags } from '~/utils/news'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = getNewsById(id)
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const data = validateBody(newsUpdateSchema, await readBody(event))
  const result = updateNews(id, {
    ...data,
    ...(data.tags !== undefined ? { tags: parseNewsTags(data.tags) } : {}),
  })

  recordAuditSafe(sqlite, { action: 'updated', entityType: 'news', entityId: id, entityName: result.title, before: newsSnapshot(existing), after: newsSnapshot(result), userId: auth.userId })
  logActivity({
    action: 'updated',
    entityType: 'news',
    entityId: id,
    entityName: result.title,
    details: { slug: result.slug, published: result.isPublished },
    userId: auth.userId,
  })

  return apiSuccess(result)
})

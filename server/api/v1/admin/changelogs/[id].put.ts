/**
 * PUT /api/v1/admin/changelogs/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'
import { validateBody, changelogUpdateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(changelogs).where(eq(changelogs.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const body = await readBody(event)
  const data = validateBody(changelogUpdateSchema, body)

  // Set publishedAt when first published
  let publishedAt = existing.publishedAt
  if (data.isPublished && !existing.isPublished) {
    publishedAt = new Date()
  }

  const result = db.update(changelogs)
    .set({
      ...(data.version !== undefined && { version: data.version }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.contentEn !== undefined && { contentEn: data.contentEn }),
      ...(data.isPublished !== undefined && { isPublished: data.isPublished, publishedAt }),
      updatedAt: new Date(),
    })
    .where(eq(changelogs.id, id))
    .returning().get()

  return apiSuccess(result)
})

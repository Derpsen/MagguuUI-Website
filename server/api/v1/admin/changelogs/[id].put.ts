/**
 * PUT /api/v1/admin/changelogs/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(changelogs).where(eq(changelogs.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const body = await readBody(event)

  // Set publishedAt when first published
  let publishedAt = existing.publishedAt
  if (body.isPublished && !existing.isPublished) {
    publishedAt = new Date()
  }

  const result = db.update(changelogs)
    .set({
      ...(body.version !== undefined && { version: body.version }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.contentEn !== undefined && { contentEn: body.contentEn }),
      ...(body.isPublished !== undefined && { isPublished: body.isPublished, publishedAt }),
      updatedAt: new Date(),
    })
    .where(eq(changelogs.id, id))
    .returning().get()

  return { success: true, data: result }
})

/**
 * POST /api/v1/admin/changelogs
 */

import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.version || !body?.content) {
    throw createError({ statusCode: 400, message: 'Version and content are required' })
  }

  const result = db.insert(changelogs).values({
    version: body.version,
    content: body.content,
    contentEn: body.contentEn || null,
    isPublished: body.isPublished ?? false,
    publishedAt: body.isPublished ? new Date() : null,
  }).returning().get()

  setResponseStatus(event, 201)
  return { success: true, data: result }
})

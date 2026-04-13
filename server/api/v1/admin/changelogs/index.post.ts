/**
 * POST /api/v1/admin/changelogs
 */

import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'
import { validateBody, changelogCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(changelogCreateSchema, body)

  const result = db.insert(changelogs).values({
    version: data.version,
    content: data.content,
    contentEn: data.contentEn ?? null,
    isPublished: data.isPublished ?? false,
    publishedAt: data.isPublished ? new Date() : null,
  }).returning().get()

  setResponseStatus(event, 201)
  return apiSuccess(result)
})

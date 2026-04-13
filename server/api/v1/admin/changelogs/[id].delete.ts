/**
 * DELETE /api/v1/admin/changelogs/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(changelogs).where(eq(changelogs.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  db.delete(changelogs).where(eq(changelogs.id, id)).run()
  return apiSuccess({ id })
})

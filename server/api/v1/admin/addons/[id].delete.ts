/**
 * DELETE /api/v1/admin/addons/:id
 *
 * Permanently remove an addon entry. The .toc sync will re-create it on the
 * next push if the addon is still listed there — to suppress permanently,
 * toggle `isVisible=false` instead.
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { addons } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid ID' })
  }

  const existing = db.select().from(addons).where(eq(addons.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Addon not found' })
  }

  db.delete(addons).where(eq(addons.id, id)).run()
  logActivity({ action: 'deleted', entityType: 'addon', entityId: id, entityName: existing.name })

  return apiSuccess({ id })
})

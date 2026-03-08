/**
 * PATCH /api/v1/admin/profiles/:id
 *
 * Quick toggle (visibility, sort order) without full update.
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid ID' })
  }

  const existing = db.select().from(profiles).where(eq(profiles.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  const body = await readBody(event)

  const result = db.update(profiles)
    .set({
      ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, id))
    .returning()
    .get()

  logActivity({ action: 'updated', entityType: 'profile', entityId: id, entityName: `${existing.addon} — ${existing.profile}`, details: 'visibility toggled' })
  triggerGitHubSync(`profile-toggled: ${existing.addon} — ${existing.profile}`).catch(() => {})
  return { success: true, data: result }
})

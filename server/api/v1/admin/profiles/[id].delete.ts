/**
 * DELETE /api/v1/admin/profiles/:id
 *
 * Delete an addon profile.
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

  db.delete(profiles).where(eq(profiles.id, id)).run()
  logActivity({ action: 'deleted', entityType: 'profile', entityId: id, entityName: `${existing.addon} — ${existing.profile}`, autoChangelog: true })
  triggerGitHubSync(`profile-deleted: ${existing.addon} — ${existing.profile}`).catch(() => {})

  return { success: true, data: { id } }
})

/**
 * DELETE /api/v1/admin/profiles/:id
 *
 * Delete an addon profile.
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'
import { parseRouteId } from '~/server/utils/adminCrud'

export default defineEventHandler(async (event) => {
  const id = parseRouteId(event)

  const existing = db.select().from(profiles).where(eq(profiles.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  db.delete(profiles).where(eq(profiles.id, id)).run()
  logActivity({ action: 'deleted', entityType: 'profile', entityId: id, entityName: `${existing.addon} — ${existing.profile}`, autoChangelog: true })
  triggerGitHubSync(`profile-deleted: ${existing.addon} — ${existing.profile}`).catch(() => {})

  return apiSuccess({ id })
})

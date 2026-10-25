/**
 * PUT /api/v1/admin/profiles/:id
 *
 * Update an addon profile.
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { recordAuditSafe, rowSnapshot } from '~/server/utils/auditLog'
import { profiles } from '~/server/database/schema'
import { validateBody, profileUpdateSchema } from '~/server/utils/validation'
import { parseRouteId } from '~/server/utils/adminCrud'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const id = parseRouteId(event)

  const existing = db.select().from(profiles).where(eq(profiles.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  const body = await readBody(event)
  const data = validateBody(profileUpdateSchema, body)

  const result = db.update(profiles)
    .set({
      ...(data.addon !== undefined && { addon: data.addon }),
      ...(data.profile !== undefined && { profile: data.profile }),
      ...(data.string !== undefined && { string: data.string }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      ...(data.customFields !== undefined && { customFields: data.customFields }),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, id))
    .returning()
    .get()

  recordAuditSafe(sqlite, { action: 'updated', entityType: 'profile', entityId: id, entityName: `${result.addon} — ${result.profile}`, before: rowSnapshot(existing), after: rowSnapshot(result), userId: auth.userId })
  logActivity({ action: 'updated', entityType: 'profile', entityId: id, entityName: `${result.addon} — ${result.profile}`, autoChangelog: true, userId: auth.userId })
  triggerGitHubSync(`profile-updated: ${result.addon} — ${result.profile}`).catch(() => {})
  return apiSuccess(result)
})

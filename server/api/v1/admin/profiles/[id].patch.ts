/**
 * PATCH /api/v1/admin/profiles/:id
 *
 * Quick toggle (visibility, sort order) without full update.
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { recordAuditSafe, rowSnapshot } from '~/server/utils/auditLog'
import { profiles } from '~/server/database/schema'
import { parseRouteId } from '~/server/utils/adminCrud'
import { validateBody, entityToggleSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const id = parseRouteId(event)

  const existing = db.select().from(profiles).where(eq(profiles.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  const body = await readBody(event)
  const data = validateBody(entityToggleSchema, body)

  const result = db.update(profiles)
    .set({
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, id))
    .returning()
    .get()

  recordAuditSafe(sqlite, { action: 'updated', entityType: 'profile', entityId: id, entityName: `${existing.addon} — ${existing.profile}`, before: rowSnapshot(existing), after: rowSnapshot(result), userId: auth.userId })
  logActivity({ action: 'updated', entityType: 'profile', entityId: id, entityName: `${existing.addon} — ${existing.profile}`, details: 'visibility toggled', userId: auth.userId })
  triggerGitHubSync(`profile-toggled: ${existing.addon} — ${existing.profile}`).catch(() => {})
  return apiSuccess(result)
})

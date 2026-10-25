/**
 * PATCH /api/v1/admin/wowup/:id
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { recordAuditSafe, rowSnapshot } from '~/server/utils/auditLog'
import { wowupStrings } from '~/server/database/schema'
import { parseRouteId } from '~/server/utils/adminCrud'
import { validateBody, visibilityToggleSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const id = parseRouteId(event)

  const existing = db.select().from(wowupStrings).where(eq(wowupStrings.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const body = await readBody(event)
  const data = validateBody(visibilityToggleSchema, body)

  const result = db.update(wowupStrings)
    .set({
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      updatedAt: new Date(),
    })
    .where(eq(wowupStrings.id, id))
    .returning().get()

  recordAuditSafe(sqlite, { action: 'updated', entityType: 'wowup', entityId: id, entityName: existing.name, before: rowSnapshot(existing), after: rowSnapshot(result), userId: auth.userId })
  logActivity({ action: 'updated', entityType: 'wowup', entityId: id, entityName: existing.name, details: 'visibility toggled', userId: auth.userId })
  triggerGitHubSync(`wowup-toggled: ${existing.name}`).catch(() => {})
  return apiSuccess(result)
})

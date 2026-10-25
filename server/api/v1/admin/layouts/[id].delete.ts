/**
 * DELETE /api/v1/admin/layouts/:id
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { recordAuditSafe, rowSnapshot } from '~/server/utils/auditLog'
import { characterLayouts } from '~/server/database/schema'
import { parseRouteId } from '~/server/utils/adminCrud'
import { resolve } from 'path'
import { unlinkSync } from 'fs'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const id = parseRouteId(event)

  const existing = db.select().from(characterLayouts).where(eq(characterLayouts.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  // Delete screenshot file if exists — resolve both paths and ensure the
  // target stays within the uploads directory to prevent path traversal.
  if (existing.screenshot) {
    const uploadsDir = resolve(process.cwd(), 'uploads')
    const filepath = resolve(uploadsDir, existing.screenshot)
    if (filepath.startsWith(uploadsDir + '/') || filepath.startsWith(uploadsDir + '\\')) {
      try { unlinkSync(filepath) } catch { /* file may not exist */ }
    }
  }

  db.delete(characterLayouts).where(eq(characterLayouts.id, id)).run()
  recordAuditSafe(sqlite, { action: 'deleted', entityType: 'layout', entityId: id, entityName: `${existing.className || ''} ${existing.spec || existing.name}`.trim(), before: rowSnapshot(existing), after: null, userId: auth.userId })
  logActivity({ action: 'deleted', entityType: 'layout', entityId: id, entityName: `${existing.className || ''} ${existing.spec || existing.name}`.trim(), autoChangelog: true, userId: auth.userId })
  triggerGitHubSync(`layout-deleted: ${existing.className || ''} ${existing.spec || existing.name}`.trim()).catch(() => {})
  return apiSuccess({ id })
})

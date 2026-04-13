/**
 * DELETE /api/v1/admin/layouts/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'
import { join, resolve } from 'path'
import { unlinkSync } from 'fs'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

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
  logActivity({ action: 'deleted', entityType: 'layout', entityId: id, entityName: `${existing.className || ''} ${existing.spec || existing.name}`.trim(), autoChangelog: true })
  triggerGitHubSync(`layout-deleted: ${existing.className || ''} ${existing.spec || existing.name}`.trim()).catch(() => {})
  return apiSuccess({ id })
})

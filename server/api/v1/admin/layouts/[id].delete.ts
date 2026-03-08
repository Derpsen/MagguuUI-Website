/**
 * DELETE /api/v1/admin/layouts/:id
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'
import { join } from 'path'
import { unlinkSync, existsSync } from 'fs'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const existing = db.select().from(characterLayouts).where(eq(characterLayouts.id, id)).get()
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  // Delete screenshot file if exists
  if (existing.screenshot) {
    const filepath = join(process.cwd(), 'uploads', existing.screenshot)
    if (existsSync(filepath)) {
      try { unlinkSync(filepath) } catch { /* ignore */ }
    }
  }

  db.delete(characterLayouts).where(eq(characterLayouts.id, id)).run()
  logActivity({ action: 'deleted', entityType: 'layout', entityId: id, entityName: `${existing.className || ''} ${existing.spec || existing.name}`.trim(), autoChangelog: true })
  triggerGitHubSync(`layout-deleted: ${existing.className || ''} ${existing.spec || existing.name}`.trim()).catch(() => {})
  return { success: true, data: { id } }
})

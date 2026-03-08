/**
 * GET /api/v1/admin/settings
 */

import { db } from '~/server/database'
import { settings } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const all = db.select().from(settings).all()

  // Convert to key-value object
  const obj: Record<string, string> = {}
  for (const s of all) {
    obj[s.key] = s.value
  }

  return { success: true, data: obj }
})

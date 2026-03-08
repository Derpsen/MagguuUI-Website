/**
 * GET /api/v1/settings
 *
 * Returns public-facing settings (social links, site info).
 * No authentication required.
 */

import { db } from '~/server/database'
import { settings } from '~/server/database/schema'
import { inArray } from 'drizzle-orm'

const PUBLIC_KEYS = ['site_name', 'site_description', 'github_url', 'discord_url', 'curseforge_url', 'banner_text', 'maintenance_mode']

export default defineEventHandler(async () => {
  const rows = db.select().from(settings)
    .where(inArray(settings.key, PUBLIC_KEYS))
    .all()

  const result: Record<string, string> = {}
  for (const row of rows) {
    result[row.key] = row.value || ''
  }

  return { success: true, data: result }
})

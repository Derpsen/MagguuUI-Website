/**
 * GET /api/v1/settings
 *
 * Returns public-facing settings (site info, SEO defaults, legal/contact details).
 * No authentication required.
 */

import { db } from '~/server/database'
import { settings } from '~/server/database/schema'
import { inArray } from 'drizzle-orm'
import { PUBLIC_SITE_SETTING_KEYS, PUBLIC_SITE_SETTINGS_DEFAULTS } from '~/utils/siteSettingsDefaults'

export default defineEventHandler(async () => {
  const rows = db.select().from(settings)
    .where(inArray(settings.key, [...PUBLIC_SITE_SETTING_KEYS]))
    .all()

  const result: Record<string, string> = { ...PUBLIC_SITE_SETTINGS_DEFAULTS }
  for (const row of rows) {
    result[row.key] = row.value || ''
  }

  return apiSuccess(result)
})

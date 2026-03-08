/**
 * PUT /api/v1/admin/settings
 *
 * Upsert settings as key-value pairs.
 * Body: { "site_name": "MagguuUI", "site_description": "..." }
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { settings } from '~/server/database/schema'
import { invalidateSettingsCache } from '~/server/utils/settings'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: 'Object with key-value pairs required' })
  }

  // Protected keys — managed by version-check/webhook, not editable via settings
  const protectedKeys = ['addon_version', 'github_latest_version', 'github_last_check']

  // Validate keys and values
  const MAX_KEY_LENGTH = 100
  const MAX_VALUE_LENGTH = 10000

  for (const [key, value] of Object.entries(body)) {
    if (protectedKeys.includes(key)) continue
    if (typeof key !== 'string' || key.length > MAX_KEY_LENGTH) continue
    const strValue = String(value ?? '')
    if (strValue.length > MAX_VALUE_LENGTH) {
      throw createError({ statusCode: 400, message: `Value for "${key}" exceeds maximum length of ${MAX_VALUE_LENGTH}` })
    }
    const existing = db.select().from(settings).where(eq(settings.key, key)).get()
    if (existing) {
      db.update(settings)
        .set({ value: strValue, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .run()
    } else {
      db.insert(settings).values({ key, value: strValue }).run()
    }
  }

  // Clear settings cache so changes take effect immediately
  invalidateSettingsCache()

  return { success: true, data: body }
})

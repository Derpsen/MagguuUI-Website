/**
 * PUT /api/v1/admin/settings
 *
 * Upsert settings as key-value pairs.
 * Body: { "site_name": "MagguuUI", "site_description": "..." }
 */

import { z } from 'zod'
import { db, sqlite } from '~/server/database'
import { settings } from '~/server/database/schema'
import { invalidateSettingsCache } from '~/server/utils/settings'
import { validateBody } from '~/server/utils/validation'

// Any setting whose key ends in `_url` must be a http(s) URL. Prevents a
// compromised admin from smuggling a `javascript:` / `data:` URI into a
// public outbound link (e.g. the footer GitHub button) where it'd execute
// under the site origin.
const URL_KEY_SUFFIX = '_url'
const isHttpUrl = (v: string) => !v || /^https?:\/\//i.test(v)

const settingsBodySchema = z
  .record(z.string().max(100), z.string().max(10_000))
  .superRefine((data, ctx) => {
    for (const [k, v] of Object.entries(data)) {
      if (k.endsWith(URL_KEY_SUFFIX) && !isHttpUrl(v)) {
        ctx.addIssue({ code: 'custom', path: [k], message: 'Must be http(s) URL' })
      }
    }
  })

export default defineEventHandler(async (event) => {
  // Site settings can disable rate-limiting via NUXT_*_TIMEOUT-style configs
  // and switch outbound URLs — must remain admin-only.
  const auth = requireAdmin(event)
  const body = await readBody(event)
  const data = validateBody(settingsBodySchema, body)

  // Protected keys — managed by version-check/webhook, not editable via settings
  const protectedKeys = ['addon_version', 'github_latest_version', 'github_last_check']

  // Single-statement upsert per key inside one transaction (one fsync, one query per key).
  sqlite.transaction(() => {
    for (const [key, value] of Object.entries(data)) {
      if (protectedKeys.includes(key)) continue
      db.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() },
        })
        .run()
    }
  })()

  // Clear settings cache so changes take effect immediately
  invalidateSettingsCache()

  const changedKeys = Object.keys(data).filter((k) => !protectedKeys.includes(k))
  if (changedKeys.length > 0) {
    logActivity({
      action: 'updated',
      entityType: 'setting',
      entityName: `${changedKeys.length} settings`,
      details: { keys: changedKeys },
      userId: auth.userId,
    })
  }

  return apiSuccess(data)
})

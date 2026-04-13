/**
 * POST /api/v1/admin/profiles
 *
 * Create a new addon profile.
 */

import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'
import { validateBody, profileCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(profileCreateSchema, body)

  const result = db.insert(profiles).values({
    addon: data.addon,
    profile: data.profile,
    string: data.string,
    description: data.description ?? null,
    sortOrder: data.sortOrder ?? 0,
    isVisible: data.isVisible ?? true,
    customFields: data.customFields ?? null,
  }).returning().get()

  setResponseStatus(event, 201)
  logActivity({ action: 'created', entityType: 'profile', entityId: result.id, entityName: `${data.addon} — ${data.profile}`, autoChangelog: true })
  triggerGitHubSync(`profile-created: ${data.addon} — ${data.profile}`).catch(() => {})
  return apiSuccess(result)
})

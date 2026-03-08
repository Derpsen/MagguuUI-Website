/**
 * POST /api/v1/admin/profiles
 *
 * Create a new addon profile.
 */

import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.addon || !body?.profile || !body?.string) {
    throw createError({ statusCode: 400, message: 'Addon, Profile and String are required' })
  }

  const result = db.insert(profiles).values({
    addon: body.addon,
    profile: body.profile,
    string: body.string,
    description: body.description || null,
    sortOrder: body.sortOrder ?? 0,
    isVisible: body.isVisible ?? true,
    customFields: body.customFields ? (typeof body.customFields === 'string' ? body.customFields : JSON.stringify(body.customFields)) : null,
  }).returning().get()

  setResponseStatus(event, 201)
  logActivity({ action: 'created', entityType: 'profile', entityId: result.id, entityName: `${body.addon} — ${body.profile}`, autoChangelog: true })
  triggerGitHubSync(`profile-created: ${body.addon} — ${body.profile}`).catch(() => {})
  return { success: true, data: result }
})

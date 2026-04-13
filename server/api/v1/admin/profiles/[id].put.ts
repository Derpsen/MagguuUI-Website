/**
 * PUT /api/v1/admin/profiles/:id
 *
 * Update an addon profile.
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'
import { validateBody, profileUpdateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid ID' })
  }

  const existing = db.select().from(profiles).where(eq(profiles.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  const body = await readBody(event)
  const data = validateBody(profileUpdateSchema, body)

  const result = db.update(profiles)
    .set({
      ...(data.addon !== undefined && { addon: data.addon }),
      ...(data.profile !== undefined && { profile: data.profile }),
      ...(data.string !== undefined && { string: data.string }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      ...(data.customFields !== undefined && { customFields: data.customFields }),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, id))
    .returning()
    .get()

  logActivity({ action: 'updated', entityType: 'profile', entityId: id, entityName: `${result.addon} — ${result.profile}`, autoChangelog: true })
  triggerGitHubSync(`profile-updated: ${result.addon} — ${result.profile}`).catch(() => {})
  return apiSuccess(result)
})

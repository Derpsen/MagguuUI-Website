/**
 * PUT /api/v1/admin/profiles/:id
 *
 * Update an addon profile.
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'

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

  const result = db.update(profiles)
    .set({
      ...(body.addon !== undefined && { addon: body.addon }),
      ...(body.profile !== undefined && { profile: body.profile }),
      ...(body.string !== undefined && { string: body.string }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
      ...(body.customFields !== undefined && { customFields: typeof body.customFields === 'string' ? body.customFields : JSON.stringify(body.customFields) }),
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, id))
    .returning()
    .get()

  logActivity({ action: 'updated', entityType: 'profile', entityId: id, entityName: `${result.addon} — ${result.profile}`, autoChangelog: true })
  triggerGitHubSync(`profile-updated: ${result.addon} — ${result.profile}`).catch(() => {})
  return { success: true, data: result }})

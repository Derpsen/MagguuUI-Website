/**
 * PATCH /api/v1/admin/addons/:id
 *
 * Partial update — admin can override any field. Manual edits never get
 * clobbered by the .toc auto-sync (it only refreshes category, tocName,
 * isAvailable, lastSyncedAt).
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { addons } from '~/server/database/schema'
import { validateBody, addonUpdateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'Invalid ID' })
  }

  const existing = db.select().from(addons).where(eq(addons.id, id)).get()
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Addon not found' })
  }

  const body = await readBody(event)
  const data = validateBody(addonUpdateSchema, body)

  if (data.slug && data.slug !== existing.slug) {
    const clash = db.select().from(addons).where(eq(addons.slug, data.slug)).get()
    if (clash) {
      throw createError({ statusCode: 409, message: 'Slug already in use' })
    }
  }

  // Promote toc-sourced rows to manual when the admin edits any field the
  // sync would otherwise overwrite (name, slug, category, tocName, emoji,
  // description, url, sortOrder). Pure visibility/availability toggles do NOT
  // promote — they are expected to coexist with the auto-sync.
  const editsContent = data.slug !== undefined
    || data.tocName !== undefined
    || data.name !== undefined
    || data.category !== undefined
    || data.emoji !== undefined
    || data.description !== undefined
    || data.url !== undefined
    || data.sortOrder !== undefined
  const promoteToManual = existing.source === 'toc' && editsContent

  const result = db.update(addons)
    .set({
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.tocName !== undefined && { tocName: data.tocName }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.emoji !== undefined && { emoji: data.emoji }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.url !== undefined && { url: data.url }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      ...(data.isVisible !== undefined && { isVisible: data.isVisible }),
      ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
      ...(promoteToManual && { source: 'manual' as const }),
      updatedAt: new Date(),
    })
    .where(eq(addons.id, id))
    .returning()
    .get()

  logActivity({ action: 'updated', entityType: 'addon', entityId: id, entityName: result.name })
  return apiSuccess(result)
})

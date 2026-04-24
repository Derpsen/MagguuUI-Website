/**
 * POST /api/v1/admin/addons
 *
 * Create a manual addon entry (no .toc binding). Useful for entries like
 * Blizzard EditMode that ship with WoW itself and never appear in OptionalDeps.
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { addons } from '~/server/database/schema'
import { validateBody, addonCreateSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const data = validateBody(addonCreateSchema, body)

  const existing = db.select().from(addons).where(eq(addons.slug, data.slug)).get()
  if (existing) {
    throw createError({ statusCode: 409, message: 'An addon with this slug already exists' })
  }

  const result = db.insert(addons).values({
    slug: data.slug,
    tocName: data.tocName ?? null,
    name: data.name,
    category: data.category,
    emoji: data.emoji ?? null,
    description: data.description ?? null,
    url: data.url ?? null,
    sortOrder: data.sortOrder ?? 0,
    isVisible: data.isVisible ?? true,
    isAvailable: true,
    // Admin-created rows are always `manual`, even when a tocName is supplied —
    // otherwise they'd be subject to the vanished-from-toc unavailable sweep.
    source: 'manual',
  }).returning().get()

  setResponseStatus(event, 201)
  logActivity({ action: 'created', entityType: 'addon', entityId: result.id, entityName: data.name })
  return apiSuccess(result)
})

/**
 * GET /api/v1/addons
 *
 * Returns the public addon catalogue (visible + available only) grouped by
 * category. Backed by the `addons` table that the .toc webhook keeps in sync.
 * Public endpoint — SWR-cached via routeRules.
 */

import { and, asc, eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { addons } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const rows = db.select({
    slug: addons.slug,
    name: addons.name,
    category: addons.category,
    emoji: addons.emoji,
    description: addons.description,
    url: addons.url,
    sortOrder: addons.sortOrder,
  }).from(addons)
    .where(and(eq(addons.isVisible, true), eq(addons.isAvailable, true)))
    .orderBy(asc(addons.category), asc(addons.sortOrder), asc(addons.name))
    .all()

  const required = rows.filter(r => r.category === 'required')
  const core = rows.filter(r => r.category === 'core')
  const optional = rows.filter(r => r.category === 'optional')

  return apiSuccess({
    required,
    core,
    optional,
    total: rows.length,
  })
})

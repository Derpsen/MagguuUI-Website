/**
 * GET /api/v1/layouts
 *
 * Returns all visible character layouts.
 */

import { eq, asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'
import { readPublicLayoutIndex } from '~/server/utils/profileReadModels'

export default defineEventHandler((event) => {
  if (getQuery(event).view === 'meta') {
    const rows = readPublicLayoutIndex()
    return apiSuccess(rows, { count: rows.length, view: 'meta' })
  }

  const rows = db
    .select()
    .from(characterLayouts)
    .where(eq(characterLayouts.isVisible, true))
    .orderBy(asc(characterLayouts.sortOrder), asc(characterLayouts.name))
    .all()

  return apiSuccess(rows, { count: rows.length })
})

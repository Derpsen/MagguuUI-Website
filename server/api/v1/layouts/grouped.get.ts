/**
 * GET /api/v1/layouts/grouped
 *
 * Returns all visible character layouts, grouped by class_name.
 * Used by sync-profiles.py to generate Data/Classes/*.lua files.
 *
 * Response format:
 * {
 *   "Warrior": [
 *     { "spec": "Arms", "importString": "1|LdC9L...", "sortOrder": 0 },
 *     { "spec": "Fury", "importString": "1|LdC7S...", "sortOrder": 1 },
 *     ...
 *   ],
 *   "Mage": [ ... ]
 * }
 */

import { eq, asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const rows = db
    .select()
    .from(characterLayouts)
    .where(eq(characterLayouts.isVisible, true))
    .orderBy(asc(characterLayouts.className), asc(characterLayouts.sortOrder), asc(characterLayouts.spec))
    .all()

  // Group by class_name
  const grouped: Record<string, Array<{
    id: number
    spec: string | null
    importString: string | null
    sortOrder: number
    description: string | null
    updatedAt: Date
  }>> = {}

  for (const row of rows) {
    const className = row.className || 'Unknown'
    if (!grouped[className]) grouped[className] = []
    grouped[className].push({
      id: row.id,
      spec: row.spec,
      importString: row.importString,
      sortOrder: row.sortOrder,
      description: row.description,
      updatedAt: row.updatedAt,
    })
  }

  return apiSuccess(grouped, {
    count: rows.length,
    classes: Object.keys(grouped).length,
  })
})

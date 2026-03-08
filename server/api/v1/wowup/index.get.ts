/**
 * GET /api/v1/wowup
 *
 * Returns all visible WowUp import strings.
 */

import { eq, asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const rows = db
    .select()
    .from(wowupStrings)
    .where(eq(wowupStrings.isVisible, true))
    .orderBy(asc(wowupStrings.sortOrder), asc(wowupStrings.name))
    .all()

  // Keyed by name for backward compatibility with sync-profiles.py
  const keyed: Record<string, { id: number; string: string; description: string | null; updatedAt: Date }> = {}
  for (const row of rows) {
    keyed[row.name] = {
      id: row.id,
      string: row.string,
      description: row.description,
      updatedAt: row.updatedAt,
    }
  }

  return apiSuccess(keyed, { count: rows.length })
})

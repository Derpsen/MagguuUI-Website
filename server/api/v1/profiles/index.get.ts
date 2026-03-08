/**
 * GET /api/v1/profiles
 *
 * Returns all visible addon profiles, grouped by addon name.
 * Supports filtering: ?addon=Plater
 */

import { eq, and, asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const addonFilter = query.addon as string | undefined

  // Build query conditions
  const conditions = [eq(profiles.isVisible, true)]
  if (addonFilter) {
    conditions.push(eq(profiles.addon, addonFilter))
  }

  const rows = db
    .select()
    .from(profiles)
    .where(and(...conditions))
    .orderBy(asc(profiles.sortOrder), asc(profiles.addon))
    .all()

  // Group by addon name
  const grouped: Record<string, Array<{
    id: number
    profile: string
    string: string
    description: string | null
    updatedAt: Date
  }>> = {}

  for (const row of rows) {
    if (!grouped[row.addon]) grouped[row.addon] = []
    grouped[row.addon].push({
      id: row.id,
      profile: row.profile,
      string: row.string,
      description: row.description,
      updatedAt: row.updatedAt,
    })
  }

  return apiSuccess(grouped, {
    count: rows.length,
    filter: addonFilter || null,
  })
})

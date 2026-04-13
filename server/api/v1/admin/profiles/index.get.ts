/**
 * GET /api/v1/admin/profiles
 *
 * Returns all profiles (including hidden) for admin management.
 * Protected by server middleware (JWT required).
 */

import { asc } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const allProfiles = db
    .select()
    .from(profiles)
    .orderBy(asc(profiles.addon), asc(profiles.sortOrder))
    .all()

  return apiSuccess(allProfiles)
})

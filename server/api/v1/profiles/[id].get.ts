/** One visible profile import string. The list endpoint stays fat unless view=meta. */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles } from '~/server/database/schema'
import { parseRouteId } from '~/server/utils/adminCrud'
import { isObsoletePackedElvUiDefault } from '~/server/utils/profileReadModels'

export default defineEventHandler((event) => {
  const id = parseRouteId(event)
  const row = db.select({
    id: profiles.id,
    addon: profiles.addon,
    profile: profiles.profile,
    string: profiles.string,
    isVisible: profiles.isVisible,
  }).from(profiles).where(eq(profiles.id, id)).get()

  if (!row || !row.isVisible || isObsoletePackedElvUiDefault(row)) {
    throw createError({ statusCode: 404, message: 'Profile not found' })
  }

  return apiSuccess({ id: row.id, string: row.string })
})

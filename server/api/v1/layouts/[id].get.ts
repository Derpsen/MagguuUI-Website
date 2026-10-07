/** One visible layout import string. The list endpoint stays fat unless view=meta. */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'
import { parseRouteId } from '~/server/utils/adminCrud'

export default defineEventHandler((event) => {
  const id = parseRouteId(event)
  const row = db.select({
    id: characterLayouts.id,
    importString: characterLayouts.importString,
    isVisible: characterLayouts.isVisible,
  }).from(characterLayouts).where(eq(characterLayouts.id, id)).get()

  if (!row || !row.isVisible) {
    throw createError({ statusCode: 404, message: 'Layout not found' })
  }

  return apiSuccess({ id: row.id, importString: row.importString ?? '' })
})

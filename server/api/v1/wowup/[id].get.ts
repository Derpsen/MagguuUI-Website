/** One visible WowUp import string. The list endpoint stays fat unless view=meta. */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { wowupStrings } from '~/server/database/schema'
import { parseRouteId } from '~/server/utils/adminCrud'

export default defineEventHandler((event) => {
  const id = parseRouteId(event)
  const row = db.select({
    id: wowupStrings.id,
    string: wowupStrings.string,
    isVisible: wowupStrings.isVisible,
  }).from(wowupStrings).where(eq(wowupStrings.id, id)).get()

  if (!row || !row.isVisible) {
    throw createError({ statusCode: 404, message: 'WowUp package not found' })
  }

  return apiSuccess({ id: row.id, string: row.string })
})

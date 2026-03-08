/**
 * POST /api/v1/copy-event
 *
 * Tracks when a user copies an import string.
 * No authentication required (public).
 */

import { db } from '~/server/database'
import { copyEvents } from '~/server/database/schema'
import { isCopyEventTrackingEnabled } from '~/server/utils/settings'

export default defineEventHandler(async (event) => {
  // Check if copy event tracking is enabled in settings
  if (!isCopyEventTrackingEnabled()) {
    return { success: true }
  }

  const body = await readBody(event)

  if (!body?.stringType || !body?.stringId) {
    throw createError({ statusCode: 400, message: 'stringType and stringId required' })
  }

  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getRequestHeader(event, 'x-real-ip')
    || '0.0.0.0'

  try {
    db.insert(copyEvents).values({
      stringType: body.stringType,
      stringId: body.stringId,
      ip,
    }).run()
  } catch { /* silently fail - tracking should not break UX */ }

  return { success: true }
})

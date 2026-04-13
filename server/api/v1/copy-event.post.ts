/**
 * POST /api/v1/copy-event
 *
 * Tracks when a user copies an import string.
 * No authentication required (public).
 */

import { db } from '~/server/database'
import { copyEvents } from '~/server/database/schema'
import { isCopyEventTrackingEnabled } from '~/server/utils/settings'

const ALLOWED_TYPES = new Set(['profile', 'wowup', 'layout'])

export default defineEventHandler(async (event) => {
  // Check if copy event tracking is enabled in settings
  if (!isCopyEventTrackingEnabled()) {
    return apiSuccess(null)
  }

  const ip = getClientIp(event)

  // 60 events / minute / IP — generous for real users, stops scripted floods.
  const { allowed } = checkRateLimit(`copy-event:${ip}`, 60, 60 * 1000, 60 * 1000)
  if (!allowed) {
    // Silently drop — tracking is best-effort and must not break UX.
    return apiSuccess(null)
  }

  const body = await readBody(event)

  const stringType = typeof body?.stringType === 'string' ? body.stringType : ''
  const stringId = Number(body?.stringId)
  if (!stringType || !Number.isInteger(stringId) || stringId <= 0) {
    throw createError({ statusCode: 400, message: 'stringType and stringId required' })
  }
  if (!ALLOWED_TYPES.has(stringType)) {
    throw createError({ statusCode: 400, message: 'Invalid stringType' })
  }

  try {
    db.insert(copyEvents).values({ stringType, stringId, ip }).run()
  } catch { /* silently fail - tracking should not break UX */ }

  return apiSuccess(null)
})

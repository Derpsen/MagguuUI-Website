/**
 * POST /api/v1/page-view
 *
 * Tracks anonymous page views with referrer, device & browser info.
 * No authentication required (public).
 * Rate-limited by design — silently drops if too frequent from same IP+path.
 */

import { db } from '~/server/database'
import { pageViews } from '~/server/database/schema'
import { parseBrowser, parseOS, parseDeviceType } from '~/server/utils/session'
import { isPageViewTrackingEnabled } from '~/server/utils/settings'

function cleanReferrer(referrer: string | null | undefined): string | null {
  if (!referrer) return null
  try {
    const url = new URL(referrer)
    // Strip own domain
    if (url.hostname === 'ui.magguu.xyz' || url.hostname === 'localhost') return null
    return url.hostname
  } catch {
    return null
  }
}

// Simple in-memory dedup (prevent duplicate tracking for same IP+path within 5s)
const recentViews = new Map<string, number>()
const DEDUP_WINDOW = 5000 // 5 seconds

// Cleanup old entries every 60s
setInterval(() => {
  const now = Date.now()
  for (const [key, time] of recentViews) {
    if (now - time > DEDUP_WINDOW) recentViews.delete(key)
  }
}, 60_000)

export default defineEventHandler(async (event) => {
  // Check if page view tracking is enabled in settings
  if (!isPageViewTrackingEnabled()) {
    return { success: true }
  }

  const body = await readBody(event)

  if (!body?.path || typeof body.path !== 'string') {
    throw createError({ statusCode: 400, message: 'path is required' })
  }

  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
    || getRequestHeader(event, 'x-real-ip')
    || '0.0.0.0'

  // Dedup check
  const dedupKey = `${ip}:${body.path}`
  if (recentViews.has(dedupKey)) {
    return { success: true }
  }
  recentViews.set(dedupKey, Date.now())

  const ua = getRequestHeader(event, 'user-agent') || ''

  try {
    db.insert(pageViews).values({
      path: body.path.substring(0, 500), // limit path length
      referrer: cleanReferrer(body.referrer),
      userAgent: ua.substring(0, 500),
      deviceType: parseDeviceType(ua),
      browser: parseBrowser(ua),
      os: parseOS(ua),
      ip,
    }).run()
  } catch { /* silently fail — tracking should not break UX */ }

  return { success: true }
})

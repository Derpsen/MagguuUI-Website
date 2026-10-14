/**
 * POST /api/v1/vitals — anonymous real-user Web Vitals beacon (first-party).
 * Stores path + metric + value only: no IP, user agent, cookie or user id.
 * Rate-limited per IP via the short-lived rate_limits table; the IP is never
 * stored with the samples. Always 204 so the beacon never surfaces errors.
 */

import { db } from '~/server/database'
import { webVitals } from '~/server/database/schema'
import { isPageViewTrackingEnabled } from '~/server/utils/settings'
import { parseVitalsBeacon } from '~/server/utils/webVitals'

export default defineEventHandler(async (event) => {
  setResponseStatus(event, 204)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (!isPageViewTrackingEnabled()) return null

  const { allowed } = checkRateLimit(`vitals:${rateLimitIpKey(getClientIp(event))}`, 30, 60_000, 60_000)
  if (!allowed) return null

  // sendBeacon posts text/plain; parse it ourselves and cap the size.
  const raw = await readRawBody(event, 'utf8').catch(() => '')
  if (!raw || raw.length > 4096) return null
  let body: unknown
  try { body = JSON.parse(raw) } catch { return null }

  const samples = parseVitalsBeacon(body)
  if (samples.length === 0) return null
  try {
    db.insert(webVitals).values(samples).run()
  } catch { /* never break the page */ }
  return null
})

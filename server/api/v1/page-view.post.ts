/**
 * POST /api/v1/page-view — anonymous, cookieless page counting (see utils/analytics.ts).
 *
 * Counts a known public route plus the referrer host. Skips Do-Not-Track / GPC,
 * bots, admin sessions, unknown routes and flooding. Stores no IP, no user agent,
 * no cookie: only a per-day salted visitor hash. Always 204, so the beacon never
 * surfaces errors.
 */

import { sqlite } from '~/server/database'
import { parseBrowser, parseDeviceType, parseOS } from '~/server/utils/session'
import { isPageViewTrackingEnabled } from '~/server/utils/settings'
import { normalizeTrackedPath } from '../../../utils/trackingRules'

// Same visitor + same route within 5 s counts once. In memory only; pinned to
// globalThis so HMR reloads do not leak timers.
const g = globalThis as unknown as { __pageViewDedup?: Map<string, number>, __pageViewDedupTimer?: NodeJS.Timeout }
const recent: Map<string, number> = g.__pageViewDedup ?? (g.__pageViewDedup = new Map())
if (!g.__pageViewDedupTimer) {
  g.__pageViewDedupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, time] of recent) if (now - time > 5000) recent.delete(key)
  }, 60_000)
  g.__pageViewDedupTimer.unref?.()
}

export default defineEventHandler(async (event) => {
  const gate = beaconGate(event, 'page-view', 120)
  if (!gate.ok || !isPageViewTrackingEnabled()) return null

  const body = await readBeaconJson(event)
  const path = normalizeTrackedPath(body?.path)
  if (!path) return null

  const browser = parseBrowser(gate.ua)
  const os = parseOS(gate.ua)
  const device = parseDeviceType(gate.ua)
  const visitor = visitorHash(gate.salt, { ip: gate.ip, browser, os, device })

  const referrer = referrerHost(body?.referrer, getRequestHeader(event, 'host') || '')
  const dedupKey = `${visitor}:${path}:${referrer ?? ''}`
  const now = Date.now()
  const last = recent.get(dedupKey)
  if (last !== undefined && now - last < 5000) return null
  recent.set(dedupKey, now)

  try {
    recordView(sqlite, { path, referrer, device, browser, os, visitor })
  } catch { /* counting must never break the page */ }
  return null
})

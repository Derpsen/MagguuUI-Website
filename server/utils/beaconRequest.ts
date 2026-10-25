/**
 * Shared request gate for the anonymous counting beacons (page views, copy clicks, web vitals).
 * The logic is in beaconGateCore.ts (unit tested); this file wires it to the session check, the
 * client address and the SQLite-backed limiter. Nothing here stores the IP or user agent.
 */

import type { H3Event } from 'h3'
import { optedOutByHeaders, readBeaconBody, runBeaconGate, type BeaconGate } from './beaconGateCore'

/** True for Do-Not-Track / Global Privacy Control request headers. */
export function requestOptedOut(event: H3Event): boolean {
  return optedOutByHeaders(event)
}

/** A logged-in admin browsing the public site is never counted. */
export function hasLoginSession(event: H3Event): boolean {
  const token = extractToken(event)
  if (!token || token.length > 4096) return false
  try { verifyToken(token); return true } catch { return false }
}

export function beaconGate(event: H3Event, name: string, max: number): BeaconGate {
  return runBeaconGate(event, name, max, {
    hasLoginSession,
    clientIp: getClientIp,
    salt: () => dailySalt.get(),
    visitorKey: anonymousRateKey,
    allow: (n, key, limit) => checkRateLimit(`${n}:${key}`, limit, 60_000, 60_000).allowed,
  })
}

/** sendBeacon posts text/plain; parse it ourselves with a hard size cap. Null when malformed. */
export function readBeaconJson(event: H3Event, maxBytes = 2048): Promise<Record<string, unknown> | null> {
  return readBeaconBody(event, maxBytes)
}

/**
 * Shared request gate for the anonymous counting beacons (page views, copy clicks).
 * Order: opt-out signals, bots, admin sessions, per-visitor rate limit. Nothing here
 * stores the IP or user agent: the rate-limit key is a daily-salted hash.
 */

import type { H3Event } from 'h3'
import { isBotUserAgent, isOptedOut } from '../../utils/trackingRules'

/** True for Do-Not-Track / Global Privacy Control request headers. */
export function requestOptedOut(event: H3Event): boolean {
  return isOptedOut({ dnt: getRequestHeader(event, 'dnt'), gpc: getRequestHeader(event, 'sec-gpc') })
}

/** A logged-in admin browsing the public site is never counted. */
export function hasLoginSession(event: H3Event): boolean {
  const token = extractToken(event)
  if (!token || token.length > 4096) return false
  try { verifyToken(token); return true } catch { return false }
}

export type BeaconGate = { ok: false } | { ok: true, ip: string, ua: string, salt: Buffer }

export function beaconGate(event: H3Event, name: string, max: number): BeaconGate {
  setResponseStatus(event, 204)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (requestOptedOut(event)) return { ok: false }
  const ua = getRequestHeader(event, 'user-agent') || ''
  if (isBotUserAgent(ua)) return { ok: false }
  if (hasLoginSession(event)) return { ok: false }
  const ip = getClientIp(event)
  const salt = dailySalt.get()
  if (!checkRateLimit(`${name}:${anonymousKey(salt, ip)}`, max, 60_000, 60_000).allowed) return { ok: false }
  return { ok: true, ip, ua, salt }
}

/** sendBeacon posts text/plain; parse it ourselves with a hard size cap. Null when malformed. */
export async function readBeaconJson(event: H3Event): Promise<Record<string, unknown> | null> {
  const raw = await readRawBody(event, 'utf8').catch(() => '')
  if (!raw || raw.length > 2048) return null
  try {
    const body = JSON.parse(raw)
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : null
  } catch { return null }
}

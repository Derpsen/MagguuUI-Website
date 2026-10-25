/**
 * Request gate for the anonymous counting beacons (pure: h3 and relative imports only, unit tested).
 * Order: opt-out signals, bots, admin sessions, per-visitor rate limit. Nothing here stores the IP or
 * the user agent: the rate-limit key is a daily-salted hash of the /64 (IPv4: the address).
 * The wiring to the database and the session lives in beaconRequest.ts.
 */
import type { H3Event } from 'h3'
import { getRequestHeader, setResponseHeader, setResponseStatus } from 'h3'
import { isBotUserAgent, isOptedOut } from '../../utils/trackingRules'
import { readBodyCapped } from './bodyCap'

export type BeaconGate = { ok: false } | { ok: true, ip: string, ua: string, salt: Buffer }

export interface BeaconGateDeps {
  hasLoginSession: (event: H3Event) => boolean
  clientIp: (event: H3Event) => string
  salt: () => Buffer
  /** Visitor key (salted /64) -> true when under the limit. Counts the call. */
  allow: (name: string, visitorKey: string, max: number) => boolean
  visitorKey: (salt: Buffer, ip: string) => string
}

/** True for Do-Not-Track / Global Privacy Control request headers. */
export function optedOutByHeaders(event: H3Event): boolean {
  return isOptedOut({ dnt: getRequestHeader(event, 'dnt'), gpc: getRequestHeader(event, 'sec-gpc') })
}

export function runBeaconGate(event: H3Event, name: string, max: number, deps: BeaconGateDeps): BeaconGate {
  setResponseStatus(event, 204)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (optedOutByHeaders(event)) return { ok: false }
  const ua = getRequestHeader(event, 'user-agent') || ''
  if (isBotUserAgent(ua)) return { ok: false }
  if (deps.hasLoginSession(event)) return { ok: false }
  const ip = deps.clientIp(event)
  const salt = deps.salt()
  if (!deps.allow(name, deps.visitorKey(salt, ip), max)) return { ok: false }
  return { ok: true, ip, ua, salt }
}

/** sendBeacon posts text/plain; parse it ourselves with a hard size cap while reading. Null when malformed or too large. */
export async function readBeaconBody(event: H3Event, maxBytes = 2048): Promise<Record<string, unknown> | null> {
  const body = await readBodyCapped(event, maxBytes)
  if (!body.ok || !body.text) return null
  try {
    const parsed = JSON.parse(body.text)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch { return null }
}

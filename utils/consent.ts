/**
 * Visitor consent: constants and pure helpers shared by the browser banner and the server.
 * Pure and dependency-free (unit tested). The consent cookie holds a choice and a timestamp, never an identifier.
 *
 *   mg_consent  {"v":1,"stats":true|false,"ts":<ms>}   set by POST /api/v1/consent after a click, 6 months,
 *                                                      SameSite=Lax, Secure on https, Path=/, readable by the page
 *   mg_sid      32 hex chars, random                    set by POST /api/v1/visitor-hit ONLY while stats consent is
 *                                                      valid, HttpOnly, 30 minutes rolling, removed on revoke
 *
 * Nothing sets a cookie before the visitor has chosen. Do-Not-Track / Global Privacy Control count as a refusal.
 */

export const CONSENT_COOKIE = 'mg_consent'
export const SESSION_COOKIE = 'mg_sid'
export const CONSENT_VERSION = 1
/** Six months. */
export const CONSENT_MAX_AGE_S = 180 * 86400
/** A server-side check allows a little more than the cookie lifetime (clock skew), never longer. */
export const CONSENT_MAX_AGE_MS = (CONSENT_MAX_AGE_S + 5 * 86400) * 1000
export const SESSION_MAX_AGE_S = 30 * 60

export interface ConsentChoice { v: number, stats: boolean, ts: number }

/** Value for the cookie (cookie libraries URL-encode it). */
export function consentValue(stats: boolean, nowMs = Date.now()): string {
  return JSON.stringify({ v: CONSENT_VERSION, stats, ts: nowMs } satisfies ConsentChoice)
}

/**
 * Parse and validate a consent cookie value (already URL-decoded or still encoded). Null for anything
 * that is not exactly what we wrote: wrong version, wrong types, extra keys, expired, from the future.
 */
export function parseConsent(raw: unknown, nowMs = Date.now()): ConsentChoice | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 200) return null
  let text = raw
  if (!text.startsWith('{')) {
    try { text = decodeURIComponent(text) } catch { return null }
  }
  let data: unknown
  try { data = JSON.parse(text) } catch { return null }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const o = data as Record<string, unknown>
  const keys = Object.keys(o)
  if (keys.length !== 3 || !keys.every(k => k === 'v' || k === 'stats' || k === 'ts')) return null
  if (o.v !== CONSENT_VERSION || typeof o.stats !== 'boolean') return null
  if (typeof o.ts !== 'number' || !Number.isFinite(o.ts)) return null
  if (o.ts > nowMs + 86_400_000 || nowMs - o.ts > CONSENT_MAX_AGE_MS) return null
  return { v: o.v, stats: o.stats, ts: o.ts }
}

/** Read the consent cookie out of a `document.cookie` string. */
export function consentFromCookieHeader(header: string | null | undefined, nowMs = Date.now()): ConsentChoice | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() === CONSENT_COOKIE) return parseConsent(part.slice(eq + 1).trim(), nowMs)
  }
  return null
}

/** A session id as the server issues it: 128 random bits as lowercase hex. */
export function isValidSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{32}$/.test(value)
}

/** NUXT_VISITOR_LOG: the detailed visitor log (banner, consent, capture) stays off unless this is set. */
export function visitorLogEnabled(value: string | undefined | null): boolean {
  return value === '1' || value === 'true'
}

/** The referrer URL as it is stored with consent: http(s) only, no fragment, at most `max` characters. */
export function cleanReferrerUrl(value: unknown, max = 500): { url: string, host: string } | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return null
  let u: URL
  try { u = new URL(value) } catch { return null }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  if (!u.hostname || !/^[a-z0-9.-]+$/i.test(u.hostname)) return null
  u.hash = ''
  return { url: u.toString().slice(0, max), host: u.hostname.toLowerCase().slice(0, 253) }
}

/** Returning-visitor id cookie (consent only): 128 random bits, HttpOnly, 13 months, removed on refusal. */
export const VISITOR_COOKIE = 'mg_vid'
export const VISITOR_MAX_AGE_S = 395 * 86400

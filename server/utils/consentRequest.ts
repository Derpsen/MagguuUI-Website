/**
 * Request flow of the consent feature (pure: h3 and relative imports only, unit tested with a real h3 app).
 * The route files only wire in the runtime (database, limiter, settings).
 *
 *   POST /api/v1/consent      {stats:boolean}  the visitor clicked: sets the consent cookie; "no" also removes the
 *                                              session cookie and that visit's records. Never called before a click.
 *   POST /api/v1/visitor-hit  {path, referrerUrl?, env?, utm?}  detailed capture; the consent is verified HERE from
 *                                              the cookie on every request, a client flag is never trusted.
 *   POST /api/v1/visitor-event {type:'leave'|'click', ...}  dwell time, scroll depth, clicks of an existing visit.
 *
 * Do-Not-Track / Global Privacy Control are a refusal: no consent cookie is written, nothing is captured.
 * Both endpoints are off (204, no cookie) while NUXT_VISITOR_LOG is not set.
 */
import type { H3Event } from 'h3'
import { createError, deleteCookie, getCookie, getRequestHost, setCookie, setResponseHeader, setResponseStatus } from 'h3'
import {
  CONSENT_COOKIE, CONSENT_MAX_AGE_S, SESSION_COOKIE, SESSION_MAX_AGE_S, VISITOR_COOKIE, VISITOR_MAX_AGE_S, cleanReferrerUrl, consentValue, parseConsent,
} from '../../utils/consent'
import { cleanDwell, cleanEnv, pickUtm, scrollMilestone, validClick } from '../../utils/visitorSignals'
import { normalizeTrackedPath } from '../../utils/trackingRules'
import { readBeaconBody, optedOutByHeaders, type BeaconGate } from './beaconGateCore'
import { requestIsHttps } from './clientIp'
import { assertSameOriginIfPresent } from './presetSubmission'
import type { VisitorEventInput, VisitorHitInput, VisitorHitResult } from './visitorLog'

function cookieOptions(event: H3Event) {
  return { sameSite: 'lax' as const, secure: requestIsHttps(event), path: '/' }
}

export function setSessionCookie(event: H3Event, sid: string) {
  setCookie(event, SESSION_COOKIE, sid, { ...cookieOptions(event), httpOnly: true, maxAge: SESSION_MAX_AGE_S })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { ...cookieOptions(event), httpOnly: true })
}

/** The returning-visitor id: consent-bound, HttpOnly, 13 months from the day it was issued (not extended). */
export function setVisitorCookie(event: H3Event, vid: string) {
  setCookie(event, VISITOR_COOKIE, vid, { ...cookieOptions(event), httpOnly: true, maxAge: VISITOR_MAX_AGE_S })
}

/** Both consent-bound cookies, only the ones the browser actually sent. */
export function clearConsentBoundCookies(event: H3Event) {
  if (getCookie(event, SESSION_COOKIE) !== undefined) clearSessionCookie(event)
  if (getCookie(event, VISITOR_COOKIE) !== undefined) deleteCookie(event, VISITOR_COOKIE, { ...cookieOptions(event), httpOnly: true })
}

/**
 * A refusal signal (Global Privacy Control / Do Not Track) ends everything the browser holds: both consent-bound
 * cookies AND the stored choice itself, so an old "yes" cannot start applying again once the signal is switched off.
 */
export function clearAllConsentCookies(event: H3Event) {
  clearConsentBoundCookies(event)
  if (getCookie(event, CONSENT_COOKIE) !== undefined) deleteCookie(event, CONSENT_COOKIE, cookieOptions(event))
}

/** The consent as the cookie says it, validated; null when absent, malformed, expired or from the future. */
export function consentFromEvent(event: H3Event, nowMs = Date.now()) {
  return parseConsent(getCookie(event, CONSENT_COOKIE), nowMs)
}

// ─── consent ────────────────────────────────────────────────────────────────

export interface ConsentDeps {
  enabled: () => boolean
  /** Per-visitor limiter (salted /64); true = allowed. */
  allow: (event: H3Event) => boolean
  /** Consent withdrawn: delete this visit and every earlier visit of this browser (session id, returning-visitor id). */
  deleteRecords: (ids: { sid?: string, vid?: string }) => number
  now?: () => number
}

export async function handleConsentChange(event: H3Event, deps: ConsentDeps) {
  setResponseStatus(event, 204)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  assertSameOriginIfPresent(event)
  if (!deps.enabled()) return null
  if (!deps.allow(event)) throw createError({ statusCode: 429, message: 'Too many requests' })

  const body = await readBeaconBody(event, 256)
  if (!body || typeof body.stats !== 'boolean') throw createError({ statusCode: 400, message: 'Invalid consent' })

  // A refusal signal wins over any click, also over an earlier "yes": the records and all three cookies go, no new choice is stored.
  if (optedOutByHeaders(event)) {
    deps.deleteRecords({ sid: getCookie(event, SESSION_COOKIE), vid: getCookie(event, VISITOR_COOKIE) })
    clearAllConsentCookies(event)
    return null
  }
  const stats = body.stats
  if (!stats) {
    deps.deleteRecords({ sid: getCookie(event, SESSION_COOKIE), vid: getCookie(event, VISITOR_COOKIE) })
    clearConsentBoundCookies(event)
  }
  setCookie(event, CONSENT_COOKIE, consentValue(stats, deps.now?.()), { ...cookieOptions(event), maxAge: CONSENT_MAX_AGE_S })
  return null
}

// ─── detailed capture ───────────────────────────────────────────────────────

export interface VisitorHitDeps {
  enabled: () => boolean
  /** Opt-out, bots, admin sessions, per-visitor rate limit (runBeaconGate). */
  gate: (event: H3Event) => BeaconGate
  parseUa: (ua: string) => { browser: string, os: string, device: string }
  country: (event: H3Event) => string
  city: (event: H3Event) => string | null
  record: (input: VisitorHitInput) => VisitorHitResult
  /** With a refusal signal: delete the records of this browser (same as a withdrawal). */
  deleteRecords?: (ids: { sid?: string, vid?: string }) => number
  now?: () => number
}

export async function handleVisitorHit(event: H3Event, deps: VisitorHitDeps) {
  const gate = deps.gate(event)
  if (!gate.ok) {
    // A refusal signal also ends what an earlier consent left behind: its records, its cookies and the stored "yes".
    if (optedOutByHeaders(event)) {
      const ids = { sid: getCookie(event, SESSION_COOKIE), vid: getCookie(event, VISITOR_COOKIE) }
      if (ids.sid !== undefined || ids.vid !== undefined) deps.deleteRecords?.(ids)
      clearAllConsentCookies(event)
    }
    return null
  }
  if (!deps.enabled()) return null
  assertSameOriginIfPresent(event)

  const sid = getCookie(event, SESSION_COOKIE)
  const consent = consentFromEvent(event, deps.now?.())
  if (!consent?.stats) {
    clearConsentBoundCookies(event) // consent-bound cookies never outlive the consent
    return null
  }

  const body = await readBeaconBody(event, 2048)
  const path = normalizeTrackedPath(body?.path)
  if (!path) return null
  const ref = cleanReferrerUrl(body?.referrerUrl)
  const own = getRequestHost(event).split(':')[0]?.toLowerCase()
  const external = ref && ref.host !== own && ref.host !== 'localhost' ? ref : null

  const result = deps.record({
    sid: sid ?? null,
    vid: getCookie(event, VISITOR_COOKIE) ?? null,
    ip: gate.ip,
    userAgent: gate.ua,
    ...deps.parseUa(gate.ua),
    country: deps.country(event),
    city: deps.city(event),
    env: cleanEnv(body?.env),
    utm: pickUtm(body?.utm),
    referrerUrl: external?.url ?? null,
    referrerHost: external?.host ?? null,
    path,
  })
  if (result.recorded) {
    setSessionCookie(event, result.sid)
    if (result.newVisitor) setVisitorCookie(event, result.vid)
  }
  return null
}

// ─── dwell time, scroll depth, clicks ───────────────────────────────────────

export interface VisitorEventDeps {
  enabled: () => boolean
  gate: (event: H3Event) => BeaconGate
  record: (sid: string | undefined, ev: VisitorEventInput) => boolean
  now?: () => number
}

/** Never creates a session and never sets a cookie; needs consent AND the session cookie of an existing visit. */
export async function handleVisitorEvent(event: H3Event, deps: VisitorEventDeps) {
  const gate = deps.gate(event)
  if (!gate.ok) return null
  if (!deps.enabled()) return null
  assertSameOriginIfPresent(event)
  const sid = getCookie(event, SESSION_COOKIE)
  if (!consentFromEvent(event, deps.now?.())?.stats || sid === undefined) return null

  const body = await readBeaconBody(event, 512)
  const path = normalizeTrackedPath(body?.path)
  if (!path) return null
  if (body?.type === 'leave') {
    const dwellS = cleanDwell(body.dwell)
    const scroll = typeof body.scroll === 'number' ? scrollMilestone(body.scroll) : 0
    if (dwellS !== null) deps.record(sid, { type: 'leave', path, dwellS, scroll })
  } else if (body?.type === 'click') {
    const click = validClick(body.kind, body.target)
    if (click) deps.record(sid, { type: 'click', path, ...click })
  }
  return null
}

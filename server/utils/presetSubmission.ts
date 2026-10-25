/**
 * The public preset submission request flow (pure: h3 and relative imports only, unit tested with
 * a real h3 app and an in-memory database). The route file only wires in the runtime state.
 *
 * Order of checks, cheapest first: same-origin, declared body size, attempt limits, body read with
 * a hard byte cap, JSON, honeypot, form token (time-trap), field validation, acceptance limits,
 * single-use token, known addon, then storage with the duplicate / queue / daily caps.
 * Honeypot hits and duplicates answer like a success. No cookie, no IP or user agent stored.
 */
import type Database from 'better-sqlite3'
import type { H3Event } from 'h3'
import { createError, getHeader, getRequestHost, setResponseHeader, setResponseStatus } from 'h3'
import { readBodyCapped } from './bodyCap'
import {
  BODY_MAX_BYTES, isKnownAddon, submissionSchema, submitPreset, verifyFormToken,
} from './communityPresets'
import { apiSuccess } from './response'

export const THANKS = { received: true, message: 'Thank you. Your preset is in the review queue. It appears on the Import Strings page once it has been approved.' }

export interface Limiter { hit: (key: string) => boolean }

export interface SubmissionDeps {
  sqlite: Pick<Database.Database, 'prepare' | 'transaction'>
  secret: () => string
  /** Opaque keys: the visitor (/64) and the wider network (/48), never the address. */
  keys: (event: H3Event) => { client: string, group: string }
  /** Every POST, per visitor and per network. */
  attempts: Limiter
  attemptsGroup: Limiter
  /** Accepted submissions: per visitor and hour, per visitor and day, per network and day. */
  accepted: Limiter
  acceptedDay: Limiter
  acceptedGroup: Limiter
  replay: { consume: (nonce: string) => boolean }
  now?: () => number
}

function fail(statusCode: number, message: string, code?: string): never {
  throw createError({ statusCode, message, ...(code ? { data: { success: false, error: { code, message } } } : {}) })
}

/** A browser sends Origin on POST; a different site must not be able to submit on a visitor's behalf. */
export function assertSameOriginIfPresent(event: H3Event) {
  const origin = getHeader(event, 'origin')
  if (!origin) return
  let host: string
  try { host = new URL(origin).host } catch { fail(403, 'Invalid Origin header') }
  if (host !== getRequestHost(event)) fail(403, 'Cross-origin request blocked')
}

export async function handlePresetSubmission(event: H3Event, deps: SubmissionDeps) {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  assertSameOriginIfPresent(event)

  const declared = Number(getHeader(event, 'content-length') || 0)
  if (declared > BODY_MAX_BYTES) fail(413, 'The submission is too large.')

  const keys = deps.keys(event)
  if (!deps.attempts.hit(keys.client) || !deps.attemptsGroup.hit(keys.group)) {
    fail(429, 'Too many attempts. Please try again later.')
  }

  const read = await readBodyCapped(event, BODY_MAX_BYTES)
  if (!read.ok) fail(read.reason === 'too_large' ? 413 : 400, read.reason === 'too_large' ? 'The submission is too large.' : 'Invalid request.')
  if (!read.text) fail(400, 'Invalid request.')
  let body: unknown
  try { body = JSON.parse(read.text) } catch { fail(400, 'Invalid request.') }
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Invalid request.')

  // Honeypot: bots fill every field. Answer exactly like a success and store nothing.
  const trap = (body as Record<string, unknown>).website
  if (typeof trap === 'string' && trap.trim() !== '') {
    setResponseStatus(event, 201)
    return apiSuccess(THANKS)
  }

  const now = deps.now?.() ?? Date.now()
  const token = verifyFormToken(deps.secret(), (body as Record<string, unknown>).token, now)
  if (!token.ok) {
    fail(400, token.problem === 'too_fast'
      ? 'The form was sent too quickly. Please wait a few seconds and try again.'
      : 'The form has expired. Please reload the page and try again.', 'FORM_TOKEN')
  }

  const parsed = submissionSchema.safeParse(body)
  if (!parsed.success) {
    const message = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
    throw createError({ statusCode: 400, message, data: { success: false, error: { code: 'VALIDATION_ERROR', message } } })
  }
  const data = parsed.data

  if (!deps.accepted.hit(keys.client) || !deps.acceptedDay.hit(keys.client) || !deps.acceptedGroup.hit(keys.group)) {
    fail(429, 'You have submitted several presets recently. Please try again later.')
  }
  if (!deps.replay.consume(token.nonce)) fail(400, 'This form was already sent. Please reload the page.', 'FORM_TOKEN')
  if (!isKnownAddon(deps.sqlite, data.addon)) fail(400, 'Choose one of the listed addons.')

  const result = submitPreset(deps.sqlite, data, Math.floor(now / 1000))
  if (result === 'queue_full' || result === 'daily_cap') {
    fail(429, 'Submissions are paused for now. Please try again tomorrow.')
  }
  setResponseStatus(event, 201)
  return apiSuccess(THANKS)
}

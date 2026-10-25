/**
 * POST /api/v1/community-presets: a visitor submits a preset for moderation.
 *
 * Public input. No account, no cookie, no IP / user agent stored. Order of checks (cheapest first):
 * same-origin, body size, per-visitor attempt limit, JSON, honeypot, form token (time-trap), field
 * validation, per-visitor acceptance limit, single-use token, known addon, then storage with the
 * duplicate / queue / daily caps. Honeypot hits and duplicates answer like a success.
 */
import { sqlite } from '~/server/database'
import {
  BODY_MAX_BYTES, isKnownAddon, submissionSchema, submitPreset, verifyFormToken,
} from '~/server/utils/communityPresets'
import {
  assertSameOriginIfPresent, presetAccepted, presetAttempts, presetClientKey, presetFormSecret, presetReplay,
} from '~/server/utils/communityPresetRuntime'
import { validateBody } from '~/server/utils/validation'

const THANKS = { received: true, message: 'Thank you. Your preset is in the review queue. It appears on the Import Strings page once it has been approved.' }

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  assertSameOriginIfPresent(event)

  const declared = Number(getRequestHeader(event, 'content-length') || 0)
  if (declared > BODY_MAX_BYTES) throw createError({ statusCode: 413, message: 'The submission is too large.' })

  const key = presetClientKey(event)
  if (!presetAttempts.hit(key)) {
    throw createError({ statusCode: 429, message: 'Too many attempts. Please try again later.' })
  }

  const raw = await readRawBody(event, 'utf8').catch(() => '')
  if (!raw || Buffer.byteLength(raw) > BODY_MAX_BYTES) throw createError({ statusCode: 413, message: 'The submission is too large.' })
  let body: unknown
  try { body = JSON.parse(raw) } catch { throw createError({ statusCode: 400, message: 'Invalid request.' }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw createError({ statusCode: 400, message: 'Invalid request.' })

  // Honeypot: bots fill every field. Answer like a success and store nothing.
  const trap = (body as Record<string, unknown>).website
  if (typeof trap === 'string' && trap.trim() !== '') return apiSuccess(THANKS)

  const secret = presetFormSecret()
  const token = verifyFormToken(secret, (body as Record<string, unknown>).token)
  if (!token.ok) {
    apiError('FORM_TOKEN', token.problem === 'too_fast'
      ? 'The form was sent too quickly. Please wait a few seconds and try again.'
      : 'The form has expired. Please reload the page and try again.', 400)
  }

  const data = validateBody(submissionSchema, body)

  if (!presetAccepted.hit(key)) {
    throw createError({ statusCode: 429, message: 'You have submitted several presets recently. Please try again later.' })
  }
  if (!presetReplay.consume(token.nonce)) {
    apiError('FORM_TOKEN', 'This form was already sent. Please reload the page.', 400)
  }
  if (!isKnownAddon(sqlite, data.addon)) throw createError({ statusCode: 400, message: 'Choose one of the listed addons.' })

  const result = submitPreset(sqlite, data)
  if (result === 'queue_full' || result === 'daily_cap') {
    throw createError({ statusCode: 429, message: 'Submissions are paused for now. Please try again tomorrow.' })
  }
  setResponseStatus(event, 201)
  return apiSuccess(THANKS)
})

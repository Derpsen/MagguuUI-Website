/**
 * POST /api/v1/auth/webauthn/login-verify
 *
 * Verify a WebAuthn authentication response and issue JWT + session.
 * Public endpoint — no auth required.
 * Follows same pattern as password login (session creation, attempt logging).
 */

import { completeSuccessfulLogin } from '~/server/utils/loginSuccess'
import { verifyPasskeyAuthentication } from '~/server/utils/webauthn'
import {
  logLoginAttempt,
  checkAccountLockout,
} from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const ua = getRequestHeader(event, 'user-agent') || ''

  // Rate limit check — same key + same threshold as password login (5/15min)
  // so a passkey path doesn't quietly become a softer credential-stuffing channel.
  const { allowed, retryAfter } = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000, 15 * 60 * 1000)
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    throw createError({
      statusCode: 429,
      message: `Too many login attempts. Please wait ${Math.ceil(retryAfter / 60)} minutes.`,
    })
  }

  const body = await readBody(event)

  if (!body?.credential) {
    throw createError({ statusCode: 400, message: 'Missing credential data' })
  }

  let result: Awaited<ReturnType<typeof verifyPasskeyAuthentication>>

  try {
    result = await verifyPasskeyAuthentication(body.credential, event)
  } catch (e: unknown) {
    // Log failed passkey attempt
    logLoginAttempt({
      username: 'passkey-attempt',
      ip,
      userAgent: ua,
      success: false,
      failReason: 'passkey_invalid',
    })

    throw createError({
      statusCode: 401,
      message: e instanceof Error ? e.message : 'Passkey authentication failed',
    })
  }

  const { user } = result

  // Check account lockout
  const lockout = checkAccountLockout(user.username)
  if (lockout.locked) {
    logLoginAttempt({
      username: user.username,
      ip,
      userAgent: ua,
      success: false,
      failReason: 'account_locked',
    })
    throw createError({
      statusCode: 423,
      message: `Account locked. Try again in ${Math.ceil(lockout.retryAfterSeconds / 60)} minutes.`,
    })
  }

  // Success — reset rate limit
  resetRateLimit(`login:${ip}`)

  return completeSuccessfulLogin({
    event,
    user,
    ip,
    userAgent: ua,
  })
})

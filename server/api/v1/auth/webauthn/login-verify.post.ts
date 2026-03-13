/**
 * POST /api/v1/auth/webauthn/login-verify
 *
 * Verify a WebAuthn authentication response and issue JWT + session.
 * Public endpoint — no auth required.
 * Follows same pattern as password login (session creation, attempt logging).
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { users } from '~/server/database/schema'
import { verifyPasskeyAuthentication } from '~/server/utils/webauthn'
import {
  createSession,
  logLoginAttempt,
  checkAccountLockout,
  hashToken,
} from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const ua = getRequestHeader(event, 'user-agent') || ''

  // Rate limit check
  const { allowed, retryAfter } = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000, 15 * 60 * 1000)
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
  } catch (e: any) {
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
      message: e.message || 'Passkey authentication failed',
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

  // Update last login + unlock if locked
  db.update(users)
    .set({ lastLogin: new Date(), isLocked: false, lockedUntil: null })
    .where(eq(users.id, user.id))
    .run()

  // Create JWT (duration from settings)
  const { getSessionTimeoutHours } = await import('~/server/utils/settings')
  const timeoutHours = getSessionTimeoutHours()
  const expiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000)
  const maxAgeSeconds = timeoutHours * 60 * 60

  const token = createToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  })

  // Create session
  const session = createSession({
    userId: user.id,
    token,
    ip,
    userAgent: ua,
    expiresAt,
  })

  // Create final token with sessionId
  const finalToken = createToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    sessionId: session.id,
  })
  setAuthCookie(event, finalToken, maxAgeSeconds)

  // Update session tokenHash
  const { sqlite } = await import('~/server/database')
  sqlite.prepare('UPDATE sessions SET token_hash = ? WHERE id = ?')
    .run(hashToken(finalToken), session.id)

  // Log successful passkey login
  logLoginAttempt({
    username: user.username,
    ip,
    userAgent: ua,
    success: true,
  })

  return {
    success: true,
    data: {
      token: finalToken,
      sessionId: session.id,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    },
  }
})

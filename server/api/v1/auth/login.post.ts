/**
 * POST /api/v1/auth/login
 *
 * Authenticate admin user and return JWT token + session.
 * Rate-limited: 5 attempts per 15 minutes per IP, then 15 min block.
 * Account lockout: 10 failed attempts in 30 min → 30 min lock.
 */

import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { users } from '~/server/database/schema'
import {
  createSession,
  logLoginAttempt,
  checkAccountLockout,
  checkAndLockIfNeeded,
} from '~/server/utils/session'

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const ua = getRequestHeader(event, 'user-agent') || ''

  // Rate limit check
  const { allowed, retryAfter } = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000, 15 * 60 * 1000)
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    throw createError({
      statusCode: 429,
      message: `Too many login attempts. Please wait ${Math.ceil(retryAfter / 60)} minutes.`,
    })
  }

  const body = await readBody(event)

  if (!body?.username || !body?.password) {
    throw createError({
      statusCode: 400,
      message: 'Username and password required',
    })
  }

  // Check account lockout
  const lockout = checkAccountLockout(body.username)
  if (lockout.locked) {
    logLoginAttempt({
      username: body.username,
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

  // Constant-time user lookup (don't reveal if user exists)
  const user = db
    .select()
    .from(users)
    .where(eq(users.username, body.username))
    .get()

  // Always hash-compare even if user not found (timing attack prevention)
  const hashToCompare = user?.passwordHash || '$2b$12$invalidhashplaceholderxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
  const valid = await bcrypt.compare(body.password, hashToCompare)

  if (!user || !valid) {
    // Log failed attempt
    logLoginAttempt({
      username: body.username,
      ip,
      userAgent: ua,
      success: false,
      failReason: !user ? 'user_not_found' : 'invalid_password',
    })

    // Check if should lock the account now
    checkAndLockIfNeeded(body.username)

    throw createError({
      statusCode: 401,
      message: 'Invalid credentials',
    })
  }

  // Success — reset rate limit for this IP
  resetRateLimit(`login:${ip}`)

  // Update last login + unlock if was locked
  db.update(users)
    .set({ lastLogin: new Date(), isLocked: false, lockedUntil: null })
    .where(eq(users.id, user.id))
    .run()

  // Create JWT with sessionId (duration from settings)
  const { getSessionTimeoutHours } = await import('~/server/utils/settings')
  const timeoutHours = getSessionTimeoutHours()
  const expiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000)
  const maxAgeSeconds = timeoutHours * 60 * 60

  // Create token first (need it for session hash)
  const token = createToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  })

  // Create session in DB
  const session = createSession({
    userId: user.id,
    token,
    ip,
    userAgent: ua,
    expiresAt,
  })

  // Create final token with sessionId included
  const finalToken = createToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    sessionId: session.id,
  })
  setAuthCookie(event, finalToken, maxAgeSeconds)

  // Update session tokenHash with the final token (which includes sessionId)
  const { hashToken } = await import('~/server/utils/session')
  const { sqlite } = await import('~/server/database')
  sqlite.prepare('UPDATE sessions SET token_hash = ? WHERE id = ?')
    .run(hashToken(finalToken), session.id)

  // Log successful login
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

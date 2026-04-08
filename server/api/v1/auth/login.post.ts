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
import { completeSuccessfulLogin } from '~/server/utils/loginSuccess'
import {
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

  // Hard size/shape validation before any expensive work (bcrypt, DB)
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!username || !password) {
    throw createError({ statusCode: 400, message: 'Username and password required' })
  }
  if (username.length > 100 || password.length > 200) {
    throw createError({ statusCode: 400, message: 'Invalid credentials' })
  }
  body.username = username
  body.password = password

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

  return completeSuccessfulLogin({
    event,
    user,
    ip,
    userAgent: ua,
  })
})

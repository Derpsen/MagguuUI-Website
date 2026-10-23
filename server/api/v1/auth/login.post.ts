/**
 * POST /api/v1/auth/login
 *
 * Authenticate admin user and return JWT token + session.
 * Throttled with exponential backoff on failures, per IP (5 free failures)
 * and per account across IPs (`max_login_attempts` free failures, delay capped
 * at `lockout_duration_minutes`). There is no automatic account lock any more:
 * a lock used to kill every existing session and let anyone who knew the
 * username lock the admin out. An explicit admin lock (isLocked) is still
 * honoured for new logins. Passkey login has its own path and is unchanged.
 */

import bcrypt from 'bcrypt'
import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { users } from '~/server/database/schema'
import { completeSuccessfulLogin } from '~/server/utils/loginSuccess'
import { logLoginAttempt, checkAccountLockout } from '~/server/utils/session'
import { LOGIN_ACCOUNT_BACKOFF, LOGIN_IP_BACKOFF, type BackoffConfig } from '~/server/utils/loginBackoff'
import { clearLoginFailures, loginThrottleRetryAfter, recordLoginFailure } from '~/server/utils/loginThrottle'
import { getLockoutDurationMinutes, getMaxLoginAttempts } from '~/server/utils/settings'

function throttled(event: Parameters<Parameters<typeof defineEventHandler>[0]>[0], retryAfter: number): never {
  setResponseHeader(event, 'Retry-After', retryAfter)
  const wait = retryAfter < 120 ? `${retryAfter} seconds` : `${Math.ceil(retryAfter / 60)} minutes`
  throw createError({ statusCode: 429, message: `Too many login attempts. Please wait ${wait}.` })
}

function accountBackoff(): BackoffConfig {
  return {
    ...LOGIN_ACCOUNT_BACKOFF,
    freeFailures: getMaxLoginAttempts(),
    maxMs: getLockoutDurationMinutes() * 60_000,
  }
}

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const ipKey = rateLimitIpKey(ip)
  const ua = getRequestHeader(event, 'user-agent') || ''

  // Per-IP backoff (IPv6 collapsed to /64 so sibling addresses share a key).
  const ipThrottleKey = `login-fail:ip:${ipKey}`
  const ipWait = loginThrottleRetryAfter(ipThrottleKey)
  if (ipWait > 0) throttled(event, ipWait)
  // Coarse burst cap so parallel requests can't race past the backoff before
  // their failures are recorded (bcrypt is async).
  const burst = checkRateLimit(`login:burst:${ipKey}`, 20, 60_000, 60_000)
  if (!burst.allowed) throttled(event, burst.retryAfter)

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

  // Per-account backoff across all IPs: slows distributed guessing against
  // one username without locking the account or touching its sessions.
  const userKey = body.username.toLowerCase()
  const userThrottleKey = `login-fail:user:${userKey}`
  const userWait = loginThrottleRetryAfter(userThrottleKey)
  if (userWait > 0) throttled(event, userWait)

  // Explicit admin lock (no automatic locking any more)
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

    recordLoginFailure(ipThrottleKey, LOGIN_IP_BACKOFF)
    recordLoginFailure(userThrottleKey, accountBackoff())

    throw createError({
      statusCode: 401,
      message: 'Invalid credentials',
    })
  }

  // Success — clear backoff for this IP and username
  clearLoginFailures(ipThrottleKey)
  clearLoginFailures(userThrottleKey)

  return completeSuccessfulLogin({
    event,
    user,
    ip,
    userAgent: ua,
  })
})

/**
 * Auth Utilities
 *
 * JWT token creation and verification for admin authentication.
 * Now with session validation support.
 */

import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { users } from '~/server/database/schema'
import {
  hashToken,
  validateSession,
  revokeSession,
  parseBrowser,
  parseOS,
} from '~/server/utils/session'
import { getSessionTimeoutHours } from '~/server/utils/settings'

interface JwtPayload {
  userId: number
  username: string
  role: string
  sessionId?: number
}

export interface CurrentAuthUser {
  id: number
  username: string
  role: string
}

/**
 * Resolve authorization from current database state, not only from JWT claims.
 * Deleted or locked users are rejected and role changes take effect without
 * waiting for an existing token to expire.
 */
export function getCurrentAuthUser(userId: number): CurrentAuthUser | null {
  const user = db.select({
    id: users.id,
    username: users.username,
    role: users.role,
    isLocked: users.isLocked,
  })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!user || user.isLocked) return null
  return { id: user.id, username: user.username, role: user.role }
}

// `__Host-` prefix is enforced by browsers as Secure + no Domain + Path=/.
// It hardens against subdomain-cookie injection, but requires Secure=true,
// which dev (HTTP) cannot satisfy — so we only apply the prefix in production.
const isProd = process.env.NODE_ENV === 'production'
const COOKIE_NAME_PROD = '__Host-magguuui_session'
const COOKIE_NAME_DEV = 'magguuui_session'
const LEGACY_COOKIE_NAMES = ['magguuui_session']

function getAuthCookieName() {
  const config = useRuntimeConfig()
  if (config.authCookieName) return config.authCookieName
  return isProd ? COOKIE_NAME_PROD : COOKIE_NAME_DEV
}

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: isProd,
  path: '/',
}

export function setAuthCookie(event: H3Event, token: string, maxAgeSeconds: number) {
  setCookie(event, getAuthCookieName(), token, {
    ...AUTH_COOKIE_OPTIONS,
    maxAge: maxAgeSeconds,
  })
}

export function clearAuthCookie(event: H3Event) {
  deleteCookie(event, getAuthCookieName(), AUTH_COOKIE_OPTIONS)
  // Best-effort: also clear any legacy cookie names left from earlier deploys
  // so a stale token can't keep authenticating after rotation.
  for (const name of LEGACY_COOKIE_NAMES) {
    if (name !== getAuthCookieName()) deleteCookie(event, name, AUTH_COOKIE_OPTIONS)
  }
}

/**
 * Create a signed JWT token
 */
export function createToken(payload: JwtPayload): string {
  const config = useRuntimeConfig()
  const hours = getSessionTimeoutHours() // default 24
  return jwt.sign(payload, config.jwtSecret, { expiresIn: `${hours}h` })
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload {
  const config = useRuntimeConfig()
  // Pin to HS256 explicitly: jsonwebtoken@9 mitigates `alg=none` and HS/RS
  // confusion at the library level, but an explicit allowlist forecloses
  // future regressions and library-fork drift.
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as JwtPayload
}

/**
 * Extract token from Authorization header
 */
export function extractToken(event: H3Event): string | null {
  const header = getHeader(event, 'authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7)

  const cookieToken = getCookie(event, getAuthCookieName())
  if (cookieToken) return cookieToken

  // Accept legacy cookie names during the rollover window so existing sessions
  // remain valid after a cookie-name change. Old cookies are cleared on logout.
  for (const name of LEGACY_COOKIE_NAMES) {
    if (name === getAuthCookieName()) continue
    const legacy = getCookie(event, name)
    if (legacy) return legacy
  }

  return null
}

/**
 * Require valid admin JWT — throws 401 if invalid
 * Also validates session if sessionId is present in the token (backward compatible)
 */
// JWTs we issue are well under 1 KB. Reject anything substantially larger so
// an attacker cannot force expensive jwt.verify cycles on multi-megabyte input.
const MAX_TOKEN_LENGTH = 4096

export function requireAuth(event: H3Event): JwtPayload {
  const token = extractToken(event)
  if (!token) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }
  if (token.length > MAX_TOKEN_LENGTH) {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }

  let payload: JwtPayload
  try {
    payload = verifyToken(token)
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  const currentUser = getCurrentAuthUser(payload.userId)
  if (!currentUser) {
    throw createError({ statusCode: 401, message: 'Account no longer active' })
  }
  payload = {
    ...payload,
    username: currentUser.username,
    role: currentUser.role,
  }

  // Session validation (only for tokens that include sessionId — backward compatible)
  if (payload.sessionId) {
    const tokenH = hashToken(token)
    const session = validateSession(tokenH)
    if (!session) {
      throw createError({ statusCode: 401, message: 'Session revoked or expired' })
    }
    // Defense in depth: a forged or tampered DB row should not be honored under
    // a different identity than the JWT was signed for.
    if (session.userId !== payload.userId) {
      throw createError({ statusCode: 401, message: 'Session/token user mismatch' })
    }

    // Bind session to UA family (browser+OS). Stricter than comparing exact
    // UA strings (which rotate with every minor browser update), looser than
    // IP binding (which would break legitimate WLAN↔cellular transitions).
    // On drift we revoke and force re-auth — a stolen cookie replayed from
    // a different OS or browser is the signal we want to catch.
    if (session.browser && session.os) {
      const currentUa = getHeader(event, 'user-agent') || ''
      const currentBrowser = parseBrowser(currentUa)
      const currentOs = parseOS(currentUa)
      if (session.browser !== currentBrowser || session.os !== currentOs) {
        revokeSession(session.id)
        throw createError({
          statusCode: 401,
          message: 'Session context changed — please log in again',
        })
      }
    }

    // Attach session info to event context for downstream use
    event.context.sessionId = session.id
    event.context.session = session
  }

  return payload
}

/**
 * Require valid admin JWT AND `role === 'admin'`. Defence-in-depth on top of
 * the admin-api middleware role check, so a future role expansion (or a missed
 * write-method check) cannot quietly grant access to destructive endpoints.
 */
export function requireAdmin(event: H3Event): JwtPayload {
  const auth = requireAuth(event)
  if (auth.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Admin role required' })
  }
  return auth
}

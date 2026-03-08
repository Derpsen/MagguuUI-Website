/**
 * Auth Utilities
 *
 * JWT token creation and verification for admin authentication.
 * Now with session validation support.
 */

import jwt from 'jsonwebtoken'
import type { H3Event } from 'h3'
import { hashToken, validateSession } from '~/server/utils/session'
import { getSessionTimeoutHours } from '~/server/utils/settings'

interface JwtPayload {
  userId: number
  username: string
  role: string
  sessionId?: number
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
  return jwt.verify(token, config.jwtSecret) as JwtPayload
}

/**
 * Extract token from Authorization header
 */
export function extractToken(event: H3Event): string | null {
  const header = getHeader(event, 'authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7)
}

/**
 * Require valid admin JWT — throws 401 if invalid
 * Also validates session if sessionId is present in the token (backward compatible)
 */
export function requireAuth(event: H3Event): JwtPayload {
  const token = extractToken(event)
  if (!token) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }

  let payload: JwtPayload
  try {
    payload = verifyToken(token)
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid or expired token' })
  }

  // Session validation (only for tokens that include sessionId — backward compatible)
  if (payload.sessionId) {
    const tokenH = hashToken(token)
    const session = validateSession(tokenH)
    if (!session) {
      throw createError({ statusCode: 401, message: 'Session revoked or expired' })
    }
    // Attach session info to event context for downstream use
    event.context.sessionId = session.id
    event.context.session = session
  }

  return payload
}

/**
 * Require valid API key — throws 401 if invalid
 */
export async function requireApiKey(event: H3Event): Promise<void> {
  const apiKey = getHeader(event, 'x-api-key')
  if (!apiKey) {
    throw createError({ statusCode: 401, message: 'API key required' })
  }

  const config = useRuntimeConfig()
  if (apiKey !== config.apiKey) {
    throw createError({ statusCode: 401, message: 'Invalid API key' })
  }
}

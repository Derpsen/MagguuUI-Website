/**
 * Rate Limiter — SQLite-backed, persistent across restarts
 *
 * Protects login and sensitive endpoints against brute-force.
 * Uses DB-backed key tracking so limits survive restarts and match the app's single-node SQLite setup.
 */

import { sqlite } from '~/server/database'

interface RateEntryRow {
  key: string
  count: number
  first_attempt: number
  blocked_until: number
  updated_at: number
}

const getRateLimitStmt = sqlite.prepare(
  'SELECT key, count, first_attempt, blocked_until, updated_at FROM rate_limits WHERE key = ?',
)

const insertRateLimitStmt = sqlite.prepare(
  'INSERT INTO rate_limits (key, count, first_attempt, blocked_until, updated_at) VALUES (?, ?, ?, ?, ?)',
)

const updateRateLimitStmt = sqlite.prepare(
  'UPDATE rate_limits SET count = ?, first_attempt = ?, blocked_until = ?, updated_at = ? WHERE key = ?',
)

const deleteRateLimitStmt = sqlite.prepare('DELETE FROM rate_limits WHERE key = ?')
const cleanupRateLimitStmt = sqlite.prepare(
  'DELETE FROM rate_limits WHERE updated_at < ? AND blocked_until < ?',
)

/**
 * Check rate limit for a given key (usually IP).
 * Returns { allowed, remaining, retryAfter } where retryAfter is seconds.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000, // 15 min
  blockMs: number = 15 * 60 * 1000,  // 15 min block
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now()
  let result = {
    allowed: true,
    remaining: Math.max(0, maxAttempts - 1),
    retryAfter: 0,
  }

  const run = sqlite.transaction(() => {
    const entry = getRateLimitStmt.get(key) as RateEntryRow | undefined

    if (!entry) {
      insertRateLimitStmt.run(key, 1, now, 0, now)
      result = { allowed: true, remaining: Math.max(0, maxAttempts - 1), retryAfter: 0 }
      return
    }

    if (entry.blocked_until > now) {
      result = {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((entry.blocked_until - now) / 1000),
      }
      return
    }

    if (now - entry.first_attempt > windowMs) {
      updateRateLimitStmt.run(1, now, 0, now, key)
      result = { allowed: true, remaining: Math.max(0, maxAttempts - 1), retryAfter: 0 }
      return
    }

    const nextCount = entry.count + 1

    if (nextCount > maxAttempts) {
      updateRateLimitStmt.run(nextCount, entry.first_attempt, now + blockMs, now, key)
      result = {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil(blockMs / 1000),
      }
      return
    }

    updateRateLimitStmt.run(nextCount, entry.first_attempt, 0, now, key)
    result = {
      allowed: true,
      remaining: Math.max(0, maxAttempts - nextCount),
      retryAfter: 0,
    }
  })

  run()
  return result
}

/**
 * Reset rate limit for a key (e.g. after successful login).
 */
export function resetRateLimit(key: string) {
  deleteRateLimitStmt.run(key)
}

/**
 * Remove stale rate-limit rows.
 */
export function cleanupRateLimits(retentionMs: number = 24 * 60 * 60 * 1000) {
  const now = Date.now()
  cleanupRateLimitStmt.run(now - retentionMs, now)
}

/**
 * Get client IP from H3 event.
 *
 * Priority:
 * 1. `cf-connecting-ip` — set by Cloudflare tunnel; not forgeable by the client
 *    because CF strips any value supplied in the request.
 * 2. `x-real-ip` — set by reverse proxies we control.
 * 3. Raw socket address — always trustworthy (local).
 *
 * `x-forwarded-for` is intentionally NOT trusted by default: an attacker can
 * set it freely to bypass IP-keyed rate limits. It is only honored as a last
 * resort when no other signal is available.
 */
export function getClientIp(event: any): string {
  const cf = getHeader(event, 'cf-connecting-ip')
  if (cf) return cf.trim()

  const real = getHeader(event, 'x-real-ip')
  if (real) return real.trim()

  const socket = event.node?.req?.socket?.remoteAddress
  if (socket && socket !== '::1' && socket !== '127.0.0.1') return socket

  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()

  return socket || 'unknown'
}

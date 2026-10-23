/**
 * Rate Limiter — SQLite-backed, persistent across restarts
 *
 * Protects login and sensitive endpoints against brute-force.
 * Uses DB-backed key tracking so limits survive restarts and match the app's single-node SQLite setup.
 */

import type { H3Event } from 'h3'
import { sqlite } from '~/server/database'
import { isTrustedProxy, parseTrustedProxies } from '~/server/utils/trustedProxy'

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
 * Proxy headers are believed only when the TCP peer is a trusted proxy
 * (NUXT_TRUSTED_PROXIES, default `private`; see trustedProxy.ts). The
 * container port is reachable on the LAN, so a direct caller could otherwise
 * spoof `cf-connecting-ip` and choose its own rate-limit key.
 *
 * From a trusted proxy, priority is:
 * 1. `cf-connecting-ip` — set by the Cloudflare tunnel (CF overwrites any
 *    client-supplied value).
 * 2. `x-real-ip` — set by reverse proxies we control.
 * 3. `x-forwarded-for` first hop — last resort, warned once in production.
 * Otherwise (or with no headers) the socket address is used.
 */
let warnedForwardedForFallback = false
let warnedProxySocket = false
let trustedCache: { raw: string | undefined; list: ReturnType<typeof parseTrustedProxies> } | null = null

function trustedProxies() {
  const raw = process.env.NUXT_TRUSTED_PROXIES
  if (!trustedCache || trustedCache.raw !== raw) {
    trustedCache = { raw, list: parseTrustedProxies(raw) }
  }
  return trustedCache.list
}

export function getClientIp(event: H3Event): string {
  const socket = event.node?.req?.socket?.remoteAddress
  const cf = getHeader(event, 'cf-connecting-ip')

  if (!isTrustedProxy(socket, trustedProxies())) {
    return socket || 'unknown'
  }

  if (cf) {
    if (process.env.NODE_ENV === 'production' && !warnedProxySocket) {
      // One-shot hint so ops can pin NUXT_TRUSTED_PROXIES to the exact
      // cloudflared address (docker logs MagguuUI | grep trusted-proxy).
      warnedProxySocket = true
      console.info(`[trusted-proxy] cf-connecting-ip accepted from socket ${socket}`)
    }
    return cf.trim()
  }

  const real = getHeader(event, 'x-real-ip')
  if (real) return real.trim()

  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    if (process.env.NODE_ENV === 'production' && !warnedForwardedForFallback) {
      warnedForwardedForFallback = true
      console.warn('[rateLimit] cf-connecting-ip and x-real-ip missing in production; ' +
        'falling back to x-forwarded-for from a trusted proxy.')
    }
    return (forwarded.split(',')[0] ?? forwarded).trim()
  }

  return socket || 'unknown'
}

/**
 * Normalize an IP for rate-limit keying. IPv4 addresses are returned as-is.
 * IPv6 addresses are reduced to their /64 prefix because most consumer ISPs
 * delegate at least a /64 to a single subscriber — without this collapse, an
 * attacker rotates trivially through 18 quintillion sibling addresses to
 * bypass per-IP throttling.
 */
export function rateLimitIpKey(ip: string): string {
  if (!ip || ip === 'unknown') return ip || 'unknown'
  if (!ip.includes(':')) return ip
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (mapped?.[1]) return mapped[1]
  const [head, tail = ''] = ip.split('::')
  const headGroups = head ? head.split(':') : []
  const tailGroups = tail ? tail.split(':') : []
  const missing = 8 - headGroups.length - tailGroups.length
  const groups = [...headGroups, ...Array(Math.max(0, missing)).fill('0'), ...tailGroups]
  return groups.slice(0, 4).join(':') + '::/64'
}

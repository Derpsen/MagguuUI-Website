/**
 * Rate Limiter — In-memory rate limiting
 *
 * Protects login and sensitive endpoints against brute-force.
 * Uses IP-based tracking with automatic cleanup.
 */

interface RateEntry {
  count: number
  firstAttempt: number
  blockedUntil: number
}

const store = new Map<string, RateEntry>()

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now - entry.firstAttempt > 60 * 60 * 1000) { // 1h
      store.delete(key)
    }
  }
}, 10 * 60 * 1000)

/**
 * Check rate limit for a given key (usually IP).
 * Returns { allowed, retryAfter } where retryAfter is seconds.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000, // 15 min
  blockMs: number = 15 * 60 * 1000,  // 15 min block
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry) {
    store.set(key, { count: 1, firstAttempt: now, blockedUntil: 0 })
    return { allowed: true, remaining: maxAttempts - 1, retryAfter: 0 }
  }

  // Currently blocked?
  if (entry.blockedUntil > now) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  // Window expired? Reset
  if (now - entry.firstAttempt > windowMs) {
    store.set(key, { count: 1, firstAttempt: now, blockedUntil: 0 })
    return { allowed: true, remaining: maxAttempts - 1, retryAfter: 0 }
  }

  entry.count++

  if (entry.count > maxAttempts) {
    entry.blockedUntil = now + blockMs
    const retryAfter = Math.ceil(blockMs / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  return { allowed: true, remaining: maxAttempts - entry.count, retryAfter: 0 }
}

/**
 * Reset rate limit for a key (e.g. after successful login).
 */
export function resetRateLimit(key: string) {
  store.delete(key)
}

/**
 * Get client IP from H3 event
 */
export function getClientIp(event: any): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = getHeader(event, 'x-real-ip')
  if (real) return real
  return event.node?.req?.socket?.remoteAddress || 'unknown'
}

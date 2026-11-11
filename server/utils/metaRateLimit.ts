import type { H3Event } from 'h3'
import { getClientIp } from './clientIp'
import { checkRateLimit } from './rateLimit'

/** Generous public cap for read-only /api/v1/meta (DoD 10.03). */
export function assertMetaApiRateLimit(event: H3Event) {
  const ip = getClientIp(event) || 'unknown'
  const { allowed, retryAfter } = checkRateLimit(`meta:${ip}`, 120, 60_000, 60_000)
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', retryAfter)
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
}

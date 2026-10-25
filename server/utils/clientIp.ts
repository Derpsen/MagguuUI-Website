/**
 * Client address handling for rate limiting (pure: no database, unit tested).
 * Moved out of rateLimit.ts so the request-handling code can be tested without opening the database.
 */

import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { isTrustedProxy, parseTrustedProxies } from './trustedProxy'

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

/**
 * Coarser key than rateLimitIpKey, for an aggregate limit over one network: IPv6 -> /48 (a typical
 * site allocation, 65 536 sibling /64s), IPv4 -> /24. One attacker rotating /64s inside its own
 * allocation still shares this key.
 */
export function rateLimitGroupKey(ip: string): string {
  if (!ip || ip === 'unknown') return ip || 'unknown'
  if (!ip.includes(':')) {
    const parts = ip.split('.')
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : ip
  }
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+)\.\d+$/i)
  if (mapped?.[1]) return `${mapped[1]}.0/24`
  const [head, tail = ''] = ip.split('::')
  const headGroups = head ? head.split(':') : []
  const tailGroups = tail ? tail.split(':') : []
  const missing = 8 - headGroups.length - tailGroups.length
  const groups = [...headGroups, ...Array(Math.max(0, missing)).fill('0'), ...tailGroups]
  return groups.slice(0, 3).join(':') + '::/48'
}

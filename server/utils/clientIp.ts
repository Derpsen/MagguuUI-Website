/**
 * Client address handling for rate limiting (pure: no database, unit tested).
 * Moved out of rateLimit.ts so the request-handling code can be tested without opening the database.
 */

import type { H3Event } from 'h3'
import { getHeader } from 'h3'
import { isTrustedProxy, parseTrustedProxies, trustedProxiesUnset } from './trustedProxy'

/**
 * Get client IP from H3 event.
 *
 * Proxy headers are believed only when the TCP peer is a trusted proxy
 * (NUXT_TRUSTED_PROXIES, default `loopback`; see trustedProxy.ts). The
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
let warnedUnsetProxies = false
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
    // One-shot hint for ops: forwarded headers arrive from a peer that is not trusted because nothing was configured.
    if (cf && !warnedUnsetProxies && process.env.NODE_ENV === 'production' && trustedProxiesUnset(process.env.NUXT_TRUSTED_PROXIES)) {
      warnedUnsetProxies = true
      // A public peer address is a visitor's: never written to the log. A private one is the proxy the operator has to name.
      const peer = isTrustedProxy(socket, parseTrustedProxies('private')) ? socket : 'a public address'
      console.warn(`[trusted-proxy] cf-connecting-ip from socket ${peer} ignored: NUXT_TRUSTED_PROXIES is not set (default: loopback only). ` +
        'Set it to the address of your reverse proxy / cloudflared (or "private" for the old behaviour) so visitors are not all counted as one address.')
    }
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

/** True when the TCP peer is a trusted proxy (NUXT_TRUSTED_PROXIES), i.e. its forwarded headers may be believed. */
export function isTrustedSocket(event: H3Event): boolean {
  return isTrustedProxy(event.node?.req?.socket?.remoteAddress, trustedProxies())
}

/**
 * Country of the visitor from Cloudflare's CF-IPCountry header, believed only from a trusted proxy (anyone
 * reaching the container port directly could send any value). Two letters only; Cloudflare's "XX" (unknown)
 * and "T1" (Tor) are not countries. No GeoIP lookup, no external service.
 */
export function getClientCountry(event: H3Event): string {
  if (!isTrustedSocket(event)) return 'unknown'
  const raw = getHeader(event, 'cf-ipcountry')?.trim().toUpperCase()
  return raw && /^[A-Z]{2}$/.test(raw) && raw !== 'XX' && raw !== 'T1' ? raw : 'unknown'
}

/**
 * City from a Cloudflare header, ONLY if a trusted proxy supplied it (the "Add visitor location headers" managed
 * transform sends `cf-ipcity`; without it this is null). No GeoIP lookup of our own. Letters, spaces and a few
 * punctuation marks only, capped; the value may be percent-encoded.
 */
export function getClientCity(event: H3Event): string | null {
  if (!isTrustedSocket(event)) return null
  let raw = getHeader(event, 'cf-ipcity')?.trim()
  if (!raw) return null
  try { raw = decodeURIComponent(raw) } catch { /* keep as sent */ }
  return /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{0,59}$/u.test(raw) ? raw : null
}

/** https as seen by the visitor: a TLS socket, or `x-forwarded-proto: https` from a trusted proxy. */
export function requestIsHttps(event: H3Event): boolean {
  const socket = event.node?.req?.socket as { encrypted?: boolean } | undefined
  if (socket?.encrypted) return true
  if (!isTrustedSocket(event)) return false
  return (getHeader(event, 'x-forwarded-proto') || '').split(',')[0]?.trim().toLowerCase() === 'https'
}

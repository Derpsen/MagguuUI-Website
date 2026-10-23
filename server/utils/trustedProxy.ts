/**
 * Trusted-proxy matching for client-IP headers (pure, unit tested).
 *
 * `cf-connecting-ip` / `x-real-ip` / `x-forwarded-for` are only believed when
 * the TCP peer (socket remote address) is a trusted proxy. Otherwise anyone
 * who can reach the container port directly (it sits on the LAN, br0) could
 * pick their own rate-limit key.
 *
 * NUXT_TRUSTED_PROXIES: comma/space separated IPs or CIDRs, e.g.
 * `192.168.178.30/32` (the cloudflared host). Keywords:
 *   `private` (default when unset): loopback + RFC1918 + IPv6 ULA/link-local
 *   `none`: never trust headers (socket IP only)
 */

const PRIVATE_RANGES = [
  '127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16',
  '::1/128', 'fc00::/7', 'fe80::/10',
]

interface Cidr { v6: boolean; bits: bigint; prefix: number }

function stripMapped(ip: string): string {
  const m = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  return m?.[1] ?? ip
}

function parseIp(raw: string): { v6: boolean; bits: bigint } | null {
  const ip = stripMapped(raw.trim().replace(/^\[|\]$/g, '').split('%')[0] ?? '')
  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const parts = ip.split('.').map(Number)
    if (parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null
    return { v6: false, bits: parts.reduce((acc, n) => (acc << 8n) | BigInt(n), 0n) }
  }
  if (!ip.includes(':') || !/^[0-9a-f:]+$/i.test(ip)) return null
  const halves = ip.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const missing = 8 - head.length - tail.length
  if (halves.length === 1 ? missing !== 0 : missing < 0) return null
  const groups = [...head, ...Array(Math.max(0, missing)).fill('0'), ...tail]
  if (groups.some(g => !/^[0-9a-f]{1,4}$/i.test(g))) return null
  return { v6: true, bits: groups.reduce((acc, g) => (acc << 16n) | BigInt(parseInt(g, 16)), 0n) }
}

function parseCidr(entry: string): Cidr | null {
  const [addr = '', len] = entry.split('/')
  const ip = parseIp(addr)
  if (!ip) return null
  const max = ip.v6 ? 128 : 32
  const prefix = len === undefined ? max : Number(len)
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > max) return null
  return { ...ip, prefix }
}

export function parseTrustedProxies(value: string | undefined): Cidr[] {
  const tokens = (value ?? '').split(/[\s,]+/).filter(Boolean)
  const list = tokens.length ? tokens : ['private']
  const out: Cidr[] = []
  for (const token of list) {
    if (token.toLowerCase() === 'none') continue
    if (token.toLowerCase() === 'private') {
      out.push(...PRIVATE_RANGES.map(r => parseCidr(r)!))
      continue
    }
    const cidr = parseCidr(token)
    if (cidr) out.push(cidr)
  }
  return out
}

export function isTrustedProxy(socketIp: string | undefined, trusted: Cidr[]): boolean {
  if (!socketIp) return false
  const ip = parseIp(socketIp)
  if (!ip) return false
  return trusted.some((c) => {
    if (c.v6 !== ip.v6) return false
    const width = BigInt(c.v6 ? 128 : 32)
    const shift = width - BigInt(c.prefix)
    return (ip.bits >> shift) === (c.bits >> shift)
  })
}

/**
 * Canonical request path for authorization decisions.
 *
 * h3/radix3 route on a decoded path, so a prefix check on the raw pathname
 * (e.g. `/api/v1/%61dmin/...`) can disagree with the handler that actually
 * runs. Authorize on this canonical form instead:
 *  - drop query/fragment
 *  - percent-decode repeatedly until stable (catches `%2561` double encoding)
 *  - backslashes → `/`, collapse duplicate slashes
 *  - resolve `.` / `..` segments (also the decoded `..%2f` form)
 *  - lowercase
 * Returns null when the path cannot be decoded (malformed escapes) or keeps
 * changing after several rounds; callers must treat null as "deny".
 */
const MAX_DECODE_ROUNDS = 5

export function canonicalRequestPath(rawPath: string): string | null {
  let path = (rawPath || '/').split(/[?#]/, 1)[0] || '/'

  for (let round = 0; ; round++) {
    let decoded: string
    try {
      decoded = decodeURIComponent(path)
    } catch {
      return null
    }
    if (decoded === path) break
    if (round >= MAX_DECODE_ROUNDS) return null
    path = decoded
  }

  path = path.replace(/\\/g, '/')
  const out: string[] = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      out.pop()
      continue
    }
    out.push(segment)
  }
  return `/${out.join('/')}`.toLowerCase()
}

/** True when `canonical` is `prefix` itself or a path below it. */
export function isUnderPrefix(canonical: string, prefix: string): boolean {
  return canonical === prefix || canonical.startsWith(`${prefix}/`)
}

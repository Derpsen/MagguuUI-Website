/**
 * Version helpers for the public changelog (shared by the page and the feeds).
 *
 * Parses `12.1.8`, `v12.1.8`, `12.1.6-Dev-16`, `v12.1.9-Dev`. Ordering follows
 * semver: numeric parts compare numerically (missing parts count as 0) and a
 * pre-release (`-Dev-16`) sorts BEFORE the release it belongs to.
 */

export interface ParsedVersion {
  nums: number[]
  pre: string[]
}

const VERSION_RE = /^v?(\d+(?:\.\d+)*)(?:[-+_ ]([0-9A-Za-z][0-9A-Za-z.\-_ ]*))?$/i

export function parseVersion(input: string | null | undefined): ParsedVersion | null {
  const match = VERSION_RE.exec((input ?? '').trim())
  if (!match) return null
  const nums = match[1]!.split('.').map(n => Number.parseInt(n, 10))
  if (nums.some(n => !Number.isSafeInteger(n))) return null
  const pre = (match[2] ?? '').split(/[.\-_ ]+/).filter(Boolean).map(s => s.toLowerCase())
  return { nums, pre }
}

function comparePreIds(a: string, b: string): number {
  const na = /^\d+$/.test(a)
  const nb = /^\d+$/.test(b)
  if (na && nb) return Math.sign(Number(a) - Number(b))
  if (na) return -1
  if (nb) return 1
  return a < b ? -1 : a > b ? 1 : 0
}

export function compareParsedVersions(a: ParsedVersion, b: ParsedVersion): number {
  const len = Math.max(a.nums.length, b.nums.length)
  for (let i = 0; i < len; i++) {
    const d = (a.nums[i] ?? 0) - (b.nums[i] ?? 0)
    if (d !== 0) return Math.sign(d)
  }
  if (!a.pre.length && !b.pre.length) return 0
  if (!a.pre.length) return 1
  if (!b.pre.length) return -1
  const plen = Math.max(a.pre.length, b.pre.length)
  for (let i = 0; i < plen; i++) {
    if (a.pre[i] === undefined) return -1
    if (b.pre[i] === undefined) return 1
    const c = comparePreIds(a.pre[i]!, b.pre[i]!)
    if (c !== 0) return c
  }
  return 0
}

/** Compare two version strings; null when either cannot be parsed. */
export function compareVersions(a: string, b: string): number | null {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  return pa && pb ? compareParsedVersions(pa, pb) : null
}

export interface ChangelogFilter {
  since?: string
  from?: string
  to?: string
  q?: string
}

export interface ChangelogFilterResult<T> {
  items: T[]
  active: boolean
  /** Human-readable problems with the inputs (unparseable versions). */
  errors: string[]
}

/**
 * Filter releases (newest first order is preserved).
 *  - since: only releases strictly newer than this installed version
 *  - from/to: inclusive version range
 *  - q: case-insensitive text the notes must mention (e.g. an addon name);
 *    the data model has no per-addon field, so this is a text match.
 * Unparseable version inputs are ignored and reported in `errors`.
 */
export function filterChangelog<T extends { version: string, content: string }>(
  entries: T[],
  filter: ChangelogFilter,
): ChangelogFilterResult<T> {
  const errors: string[] = []
  const read = (raw: string | undefined): ParsedVersion | null => {
    const value = (raw ?? '').trim()
    if (!value) return null
    const parsed = parseVersion(value)
    if (!parsed) errors.push(`"${value.slice(0, 40)}" is not a version number (try 12.1.8).`)
    return parsed
  }
  const since = read(filter.since)
  const from = read(filter.from)
  const to = read(filter.to)
  const q = (filter.q ?? '').trim().toLowerCase().slice(0, 80)

  const active = !!(since || from || to || q)
  if (!active) return { items: entries, active, errors }

  const items = entries.filter((entry) => {
    const v = parseVersion(entry.version)
    if ((since || from || to) && !v) return false
    if (v && since && compareParsedVersions(v, since) <= 0) return false
    if (v && from && compareParsedVersions(v, from) < 0) return false
    if (v && to && compareParsedVersions(v, to) > 0) return false
    if (q && !entry.content.toLowerCase().includes(q)) return false
    return true
  })
  return { items, active, errors }
}

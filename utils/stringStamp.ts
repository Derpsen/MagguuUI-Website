/**
 * Version/date stamp for an import string ("Version 12.1.8, updated 2026-10-14").
 *
 * There is no per-string version in the database. The date is the row's own
 * `updatedAt` (set when the string is created or edited). The version is the
 * newest published MagguuUI release (changelog row `vX.Y.Z`) whose publish day
 * is on or before the day the string was updated, i.e. the addon release that
 * was current when the string was last touched. Best effort: with no matching
 * release only the date is shown, with no date nothing is shown.
 */

export interface ReleaseStamp {
  version: string
  publishedAt: string | number | Date | null
}

export interface StringStamp {
  version: string | null
  date: string | null
  label: string
}

function toMs(value: string | number | Date | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  let ms: number
  if (value instanceof Date) ms = value.getTime()
  else if (typeof value === 'number') ms = value < 1e11 ? value * 1000 : value
  else ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : null
}

/** UTC calendar day (YYYY-MM-DD); UTC keeps SSR and client output identical. */
function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function stampVersion(raw: string): string | null {
  const match = /^v?(\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?)$/.exec(raw.trim())
  return match ? match[1]! : null
}

export function buildStringStamp(
  updatedAt: string | number | Date | null | undefined,
  releases: readonly ReleaseStamp[] | null | undefined,
): StringStamp {
  const updatedMs = toMs(updatedAt)
  if (updatedMs === null) return { version: null, date: null, label: '' }
  const date = utcDay(updatedMs)

  let best: { version: string, at: number } | null = null
  for (const release of releases ?? []) {
    const version = stampVersion(release.version)
    const at = toMs(release.publishedAt)
    if (!version || at === null) continue
    if (utcDay(at) > date) continue
    if (!best || at > best.at) best = { version, at }
  }

  return {
    version: best?.version ?? null,
    date,
    label: best ? `Version ${best.version}, updated ${date}` : `Updated ${date}`,
  }
}

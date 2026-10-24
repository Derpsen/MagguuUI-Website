/**
 * "What's new" banner logic. The browser remembers the newest release it has
 * seen in localStorage (`lastSeenVersion`). When the newest published release
 * is newer than that, a small dismissible notice links to
 * /changelog?since=<previous>. First-time visitors see nothing: the value is
 * just recorded. Pure functions so the decision is unit-testable.
 */
import { compareVersions } from './changelogVersion'

export const LAST_SEEN_KEY = 'lastSeenVersion'

export interface WhatsNewStamp {
  version: string
}

export type WhatsNewDecision =
  | { action: 'none' }
  /** Remember `latest` without showing anything (first visit, rollback, unreadable value). */
  | { action: 'record', latest: string }
  | { action: 'show', latest: string, previous: string }

/** Newest release version in a newest-first list of published release stamps. */
export function latestReleaseVersion(stamps: readonly WhatsNewStamp[] | null | undefined): string | null {
  const first = stamps?.find(s => typeof s?.version === 'string' && compareVersions(s.version, s.version) !== null)
  return first ? first.version.trim() : null
}

export function decideWhatsNew(latest: string | null, lastSeen: string | null): WhatsNewDecision {
  if (!latest) return { action: 'none' }
  if (!lastSeen) return { action: 'record', latest }
  const cmp = compareVersions(latest, lastSeen)
  if (cmp === null) return { action: 'record', latest }
  if (cmp === 0) return { action: 'none' }
  if (cmp < 0) return { action: 'record', latest }
  return { action: 'show', latest, previous: lastSeen.trim() }
}

/** `v12.1.6` -> `12.1.6`, the form the changelog `since` filter documents. */
export function displayVersion(version: string): string {
  return version.trim().replace(/^v/i, '')
}

export function changelogSinceHref(previous: string): string {
  return `/changelog?since=${encodeURIComponent(displayVersion(previous))}`
}

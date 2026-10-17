/**
 * Parses the addon's CHANGELOG.md into structured entries.
 *
 * Expected format:
 *   ## v12.0.21 (2026-04-16)
 *   ## v12.0.21 (2026-04-16) - Optional subtitle
 *
 * Blocks are separated by `---` horizontal rules or the next `## ` header.
 *
 * Public/store surfaces use only the latest version. Admin and GitHub keep
 * the full file; sync upserts the newest heading only.
 */

export interface ChangelogEntry {
  version: string
  content: string
  publishedAt: Date
}

const HEADER_RE = /^## (v\d+\.\d+(?:\.\d+)*(?:-[0-9A-Za-z.-]+)?)\s*(?:\((\d{4}-\d{2}-\d{2})\))?/
const ADDON_RELEASE_VERSION_RE = /^v?\d+\.\d+/

export function isAddonReleaseVersion(version: string | null | undefined): boolean {
  if (!version) return false
  return ADDON_RELEASE_VERSION_RE.test(version.trim())
}

export function compareAddonVersions(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split(/[.-]/).map(n => Number.parseInt(n, 10) || 0)
  const pb = b.replace(/^v/i, '').split(/[.-]/).map(n => Number.parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da !== db) return da - db
  }
  return 0
}

/** Changelog row label for notes newer than the release this site ships. */
export const UNRELEASED_CHANGELOG_VERSION = 'Unreleased'

/**
 * True for headings that are not released yet, relative to the current
 * release (e.g. `v12.1.9` or `v12.1.9-Dev` while 12.1.8 is live).
 */
export function isUnreleasedAddonVersion(version: string, currentRelease: string): boolean {
  if (/-dev$/i.test(version.trim())) return true
  return compareAddonVersions(version, currentRelease) > 0
}

export function pickLatestAddonChangelog(entries: ChangelogEntry[]): ChangelogEntry | undefined {
  if (!entries.length) return undefined
  return entries.reduce((best, entry) => {
    const dt = entry.publishedAt.getTime() - best.publishedAt.getTime()
    if (dt > 0) return entry
    if (dt < 0) return best
    return compareAddonVersions(entry.version, best.version) > 0 ? entry : best
  })
}

export function parseAddonChangelog(markdown: string): ChangelogEntry[] {
  const lines = markdown.split('\n')
  const entries: ChangelogEntry[] = []

  let currentVersion: string | null = null
  let currentDate: Date | null = null
  let currentLines: string[] = []

  function flush() {
    if (!currentVersion) return
    const content = currentLines
      .join('\n')
      .replace(/^---\s*$/gm, '')   // strip HR separators (every occurrence)
      .trim()
    if (content) {
      entries.push({
        version: currentVersion,
        content,
        publishedAt: currentDate ?? new Date(),
      })
    }
    currentLines = []
  }

  for (const line of lines) {
    const match = HEADER_RE.exec(line)
    if (match && match[1]) {
      flush()
      currentVersion = match[1]
      currentDate = match[2] ? new Date(match[2] + 'T00:00:00Z') : new Date()
    } else if (currentVersion) {
      currentLines.push(line)
    }
  }
  flush()

  return entries
}

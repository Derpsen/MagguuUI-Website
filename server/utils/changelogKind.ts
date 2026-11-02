/**
 * Which changelog rows are machine-generated (pure, no DB import).
 *
 * The `version` column is the structured marker: generators write fixed values
 * there, people write release versions. Generated rows are
 *   - `auto`             activityLog.ts (admin page: "Auto-generated changes")
 *   - `Sync YYYY-MM-DD`  syncChangelog.ts (admin page: "Version Sync YYYY-MM-DD")
 * Unpublished generated rows are not release drafts, so the admin bell and the
 * dashboard do not count them.
 */

const SYNC_VERSION = /^sync \d{4}-\d{2}-\d{2}$/

export function isGeneratedChangelogVersion(version: string | null | undefined): boolean {
  const v = (version ?? '').trim().toLowerCase()
  return v === 'auto' || SYNC_VERSION.test(v)
}

/** Count unpublished release drafts among the given unpublished rows' versions. */
export function countReleaseDrafts(
  versions: ReadonlyArray<string | null | undefined>,
  options: { excludeUnreleased?: boolean } = {},
): number {
  let n = 0
  for (const version of versions) {
    if (isGeneratedChangelogVersion(version)) continue
    if (options.excludeUnreleased && (version ?? '').trim() === 'Unreleased') continue
    n++
  }
  return n
}

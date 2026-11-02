/**
 * Pure release-version bookkeeping (no DB import, testable under tsx).
 *
 * The site's "local" MagguuUI version is the newest release tag it has
 * recorded. It used to be seeded once (addon_version) and never moved, so the
 * "Addon version outdated" bell stayed forever after a new release. Every
 * place that reads the latest release (version check, release webhook, pull)
 * now records it through applyLatestRelease, which moves local along.
 */

export function normalizeAddonVersion(version: string | null | undefined): string | null {
  if (!version?.trim()) return null
  const normalized = version.trim().replace(/^v/i, '')
  return normalized || null
}

export interface AddonSettingStore {
  get(key: string): string | null | undefined
  set(key: string, value: string): void
}

export interface AppliedRelease {
  latestVersion: string
  localVersion: string
}

/**
 * Record the newest GitHub release tag as both "latest" and "local".
 * Returns null (and writes nothing) for an empty tag.
 */
export function applyLatestRelease(
  store: AddonSettingStore,
  tag: string | null | undefined,
  now: Date = new Date(),
): AppliedRelease | null {
  const version = normalizeAddonVersion(tag)
  if (!version) return null
  store.set('github_latest_version', version)
  store.set('github_last_check', now.toISOString())
  store.set('addon_version', version)
  // Legacy override key: resolveLocalAddonVersion prefers it, so keep it in step.
  if (store.get('local_version') != null) store.set('local_version', version)
  return { latestVersion: version, localVersion: version }
}

export interface VersionMismatchNotice {
  id: 'version-mismatch'
  type: 'warning'
  title: string
  message: string
  link: string
}

export function versionMismatchNotice(
  local: string | null | undefined,
  latest: string | null | undefined,
): VersionMismatchNotice | null {
  const l = normalizeAddonVersion(local)
  const g = normalizeAddonVersion(latest)
  if (!l || !g || l === g) return null
  return {
    id: 'version-mismatch',
    type: 'warning',
    title: 'Addon version outdated',
    message: `Local MagguuUI: v${l} — GitHub latest: v${g}`,
    link: '/admin/system/github',
  }
}

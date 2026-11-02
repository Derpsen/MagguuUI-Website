/**
 * Resolve the MagguuUI release version known to this site.
 * Prefer stored settings; fall back to CURRENT_ADDON_CHANGELOG (never invent a newer version).
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { settings } from '~/server/database/schema'
import { CURRENT_ADDON_CHANGELOG } from '~/server/database/defaultAddonChangelog'
import { upsertSetting } from '~/server/utils/settings'
import { applyLatestRelease, normalizeAddonVersion, type AppliedRelease } from '~/server/utils/addonRelease'

function readSetting(key: string): string | null {
  return db.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null
}

/** Record the newest release tag as latest and local (see addonRelease.ts). */
export function recordLatestRelease(tag: string | null | undefined): AppliedRelease | null {
  return applyLatestRelease({ get: readSetting, set: upsertSetting }, tag)
}

/** Known MagguuUI release shipped with this website (from defaultAddonChangelog). */
export const KNOWN_ADDON_VERSION = normalizeAddonVersion(CURRENT_ADDON_CHANGELOG.version) || '12.1.8'

/**
 * Read local MagguuUI version from settings (local_version -> addon_version -> known product version).
 * When persistMissing is true and neither setting exists, seed addon_version with the known version.
 */
export function resolveLocalAddonVersion(options: { persistMissing?: boolean } = {}): string {
  const stored = normalizeAddonVersion(readSetting('local_version')) || normalizeAddonVersion(readSetting('addon_version'))

  if (stored) return stored

  if (options.persistMissing) {
    upsertSetting('addon_version', KNOWN_ADDON_VERSION)
  }

  return KNOWN_ADDON_VERSION
}

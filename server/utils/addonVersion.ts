/**
 * Resolve the MagguuUI release version known to this site.
 * Prefer stored settings; fall back to CURRENT_ADDON_CHANGELOG (never invent a newer version).
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { settings } from '~/server/database/schema'
import { CURRENT_ADDON_CHANGELOG } from '~/server/database/defaultAddonChangelog'
import { upsertSetting } from '~/server/utils/settings'

export function normalizeAddonVersion(version: string | null | undefined): string | null {
  if (!version?.trim()) return null
  const normalized = version.trim().replace(/^v/i, '')
  return normalized || null
}

/** Known MagguuUI release shipped with this website (from defaultAddonChangelog). */
export const KNOWN_ADDON_VERSION = normalizeAddonVersion(CURRENT_ADDON_CHANGELOG.version) || '12.1.7'

/**
 * Read local MagguuUI version from settings (local_version -> addon_version -> known product version).
 * When persistMissing is true and neither setting exists, seed addon_version with the known version.
 */
export function resolveLocalAddonVersion(options: { persistMissing?: boolean } = {}): string {
  const localRow = db.select().from(settings).where(eq(settings.key, 'local_version')).get()
  const addonRow = db.select().from(settings).where(eq(settings.key, 'addon_version')).get()
  const stored = normalizeAddonVersion(localRow?.value) || normalizeAddonVersion(addonRow?.value)

  if (stored) return stored

  if (options.persistMissing) {
    upsertSetting('addon_version', KNOWN_ADDON_VERSION)
  }

  return KNOWN_ADDON_VERSION
}

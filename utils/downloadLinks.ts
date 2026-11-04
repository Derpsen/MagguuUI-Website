import { SITE_SETTINGS_DEFAULTS, WAGO_ADDON_URL, WOWINTERFACE_ADDON_URL } from './siteSettingsDefaults'

export interface DownloadLink { id: 'curseforge' | 'wago' | 'wowinterface', label: string, href: string }

/** The three real MagguuUI download pages. CurseForge follows the admin setting, the other two are fixed. */
export function retailDownloadLinks(curseforgeSetting?: string | null): DownloadLink[] {
  return [
    { id: 'curseforge', label: 'CurseForge', href: curseforgeSetting?.trim() || SITE_SETTINGS_DEFAULTS.curseforge_url },
    { id: 'wago', label: 'Wago', href: WAGO_ADDON_URL },
    { id: 'wowinterface', label: 'WoWInterface', href: WOWINTERFACE_ADDON_URL },
  ]
}

/** "WoW 12.1.5" from a changelog body ("Ready for WoW 12.1.5 (Interface 120105)"), else null. Never guessed. */
export function patchFromChangelog(content: string | null | undefined): string | null {
  const m = content?.match(/\bWoW\s+(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\b/)
  return m?.[1] ? `WoW ${m[1]}` : null
}

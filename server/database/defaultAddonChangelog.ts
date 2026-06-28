export const CURRENT_ADDON_CHANGELOG = {
  version: 'v12.0.24',
  publishedAt: new Date('2026-06-24T00:00:00Z'),
  content: `### Improved

- **MagguuUI starts on its own:** ElvUI is no longer required for the addon to load. If ElvUI is missing, only the ElvUI-specific profile and tags are skipped.
- **Fresh installs are smoother:** **Install All** skips addons that are missing or disabled instead of getting stuck on a clean setup.
- **Setup is easier to scan:** addon lists now show matching addon icons in the installer, expert view, and status overview.
- **Itemlevel colors are yours:** you can now choose the itemlevel where green, blue, purple, and orange tag colors start.
- **More Keystone List control:** show a scalable compact Group Finder join banner with colored player names, dungeon icons, and remembered position; mirror the row layout, see the teleport cast inside the dungeon icon, adjust icon borders, or turn click-to-teleport off.
- **Updated addon profiles:** the included setup profiles were refreshed for the latest package.
- **Clearer WowUp page:** the old required list is now called **Starter Addons**, so it is clear these are recommendations for a quick start.
- **Cleaner CurseForge info:** supported addons are listed as optional extras instead of old or misleading dependency entries.
- **Ready for WoW 12.0.7:** both addon folders stay aligned with the current Retail client.

### Fixed

- **No ElvUI hard block:** MagguuUI no longer refuses to load just because ElvUI is not installed.
- **Platynator imports work again:** the profile import no longer fails with the invalid import error.
- **Keystone List is safer:** keystone changes update cleanly, and clicking a row now always uses the dungeon shown on that row.
- **No unnecessary local dev deploys:** the Sync Pack Tool no longer deploys a new local dev version when the saved profile data did not actually change.`,
} as const

/** Player-facing names for profile addon keys. Keys stay the Lua file stems the sync matches on. */
const PROFILE_ADDON_LABELS: Record<string, string> = {
  EllesmereUI: 'EllesmereUI',
  BigWigs: 'BigWigs',
  NorthernSkyRaidTools: 'Northern Sky',
  EXBoss: 'EXBoss',
  WhisperMessenger: 'Whisper Messenger',
  WIM: 'WIM',
  WaypointUI: 'Waypoint UI',
  HandyNotes: 'HandyNotes',
  TalentTreeTweaks: 'Talent Tree Tweaks',
  GTFO: 'GTFO',
  BugSack: 'BugSack',
  PremadeGroupsFilter: 'Premade Groups Filter',
  NaowhSmartReminders: 'Smart Reminders',
}

const PROFILE_ADDON_ORDER = Object.keys(PROFILE_ADDON_LABELS)

export function profileAddonLabel(addon: string): string {
  return PROFILE_ADDON_LABELS[addon] ?? addon
}

export function compareProfileAddons(a: string, b: string): number {
  const ai = PROFILE_ADDON_ORDER.indexOf(a)
  const bi = PROFILE_ADDON_ORDER.indexOf(b)
  if (ai === -1 && bi === -1) return profileAddonLabel(a).localeCompare(profileAddonLabel(b))
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
}

export function compareProfileNames(a: string, b: string): number {
  if (a === b) return 0
  if (a === 'Default') return -1
  if (b === 'Default') return 1
  return a.localeCompare(b)
}

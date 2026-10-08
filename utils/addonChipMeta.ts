/** Chip labels/icons for Supported Addons + WowUp packs. */
export interface AddonChip {
  key: string
  name: string
  emoji: string
  href: string
  kind: 'required' | 'optional' | 'wowup'
  /** Subtitle / badge: Required · Optional · WowUp */
  badge?: 'required' | 'optional' | 'wowup' | 'import'
  subtitle?: string
}

const PROFILE_KEY_BY_SLUG: Record<string, string> = {
  ellesmereui: 'EllesmereUI',
  bigwigs: 'BigWigs',
  'northern-sky-raid-tools': 'NorthernSkyRaidTools',
  exboss: 'EXBoss',
  'whisper-messenger': 'WhisperMessenger',
  wim: 'WIM',
  waypointui: 'WaypointUI',
  handynotes: 'HandyNotes',
  'talent-tree-tweaks': 'TalentTreeTweaks',
  gtfo: 'GTFO',
  bugsack: 'BugSack',
  'premade-groups-filter': 'PremadeGroupsFilter',
  'smart-reminders': 'NaowhSmartReminders',
}

/** WowUp starter pack slugs (EllesmereUI also Required on the site). MagguuUI itself is not an addons-row. */
export const WOWUP_STARTER_SLUGS = new Set([
  'ellesmereui',
  'bigwigs',
  'littlewigs',
  'northern-sky-raid-tools',
  'exboss',
  'excore',
])

/** Slugs in WowUp optional pack (chat = Whisper Messenger, never WIM). */
export const WOWUP_OPTIONAL_SLUGS = new Set([
  'buggrabber',
  'bugsack',
  'handynotes',
  'handynotes-mapnotes',
  'mdt',
  'raiderio',
  'simulationcraft',
  'talent-tree-tweaks',
  'whisper-messenger',
  'waypointui',
  'gtfo',
  'premade-groups-filter',
  'auctionator',
  'smart-reminders',
])

export const ADDON_EMOJI_BY_NAME: Record<string, string> = {
  EllesmereUI: '🎨',
  MagguuUI: '✨',
  BigWigs: '⏱️',
  'BigWigs (Boss Timers & Tools)': '⏱️',
  LittleWigs: '⏱️',
  'Northern Sky': '🧭',
  'Northern Sky Raid Tools': '🧭',
  EXBoss: '📣',
  EXBOSS: '📣',
  EXCore: '🧩',
  WIM: '💬',
  'Whisper Messenger': '💬',
  'Whisper Messenger (WhisperMessenger)': '💬',
  WhisperMessenger: '💬',
  'Waypoint UI': '📍',
  HandyNotes: '📌',
  'HandyNotes: MapNotes': '📌',
  'HandyNotes MapNotes': '📌',
  'Talent Tree Tweaks': '🌳',
  GTFO: '⚠️',
  BugSack: '🐛',
  BugGrabber: '🐛',
  'Premade Groups Filter': '🔍',
  'Smart Reminders': '⏰',
  'Naowh Smart Reminders': '⏰',
  Auctionator: '💰',
  'Mythic Dungeon Tools - MDT': '🗺️',
  MDT: '🗺️',
  'Raider.IO Mythic Plus, Raid Progress, and Recruitment': '📊',
  'Raider.IO': '📊',
  Simulationcraft: '📈',
}

export function emojiForAddonName(name: string): string {
  if (ADDON_EMOJI_BY_NAME[name]) return ADDON_EMOJI_BY_NAME[name]
  const lower = name.toLowerCase()
  if (lower.includes('whisper')) return '💬'
  if (lower.includes('wim')) return '💬'
  if (lower.includes('bigwig') || lower.includes('littlewig')) return '⏱️'
  if (lower.includes('northern')) return '🧭'
  if (lower.includes('exboss') || lower.includes('exboss')) return '📣'
  if (lower.includes('handy')) return '📌'
  return '🧩'
}

export function displayAddonName(raw: string): string {
  return raw
    .replace(/\s*\(Boss Timers & Tools\)/i, '')
    .replace(/\s*\(WhisperMessenger\)/i, '')
    .replace(/^Naowh Smart Reminders$/i, 'Smart Reminders')
    .replace(/^EXBOSS$/i, 'EXBoss')
    .replace(/^Mythic Dungeon Tools - MDT$/i, 'MDT')
    .replace(/^Raider\.IO.*/i, 'Raider.IO')
    .replace(/^HandyNotes: MapNotes$/i, 'HandyNotes MapNotes')
    .trim()
}

export function profileHrefForSlug(slug: string): string {
  const key = PROFILE_KEY_BY_SLUG[slug]
  return key ? `/strings?addon=${encodeURIComponent(key)}` : '/addons'
}

export function wowupPackContainsWim(b64: string): boolean {
  return parseWowupAddonNames(b64).some(name => name.trim().toLowerCase() === 'wim')
}

export function parseWowupAddonNames(b64: string): string[] {
  try {
    const raw = typeof atob === 'function'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('utf8')
    const parsed = JSON.parse(raw) as { addons?: Array<{ name?: string }> }
    return (parsed.addons || []).map(a => a.name || '').filter(Boolean)
  } catch {
    return []
  }
}

/** Public label for WowUp pack keys (storage still uses Required / Optional). */
export function wowupLabel(name: string): string {
  if (name === 'Required') return 'Starter Addons'
  if (name === 'Optional') return 'Optional Addons'
  return name
}

export type AddonGroupKey = 'required' | 'optional' | 'wowup'

export function isWowupPackSlug(slug: string): boolean {
  return WOWUP_STARTER_SLUGS.has(slug) || WOWUP_OPTIONAL_SLUGS.has(slug)
}

/** Public home list: EllesmereUI is required. Every other addon is optional. */
export function addonGroupForSlug(slug: string, category: 'required' | 'core' | 'optional'): AddonGroupKey {
  if (category === 'required' || slug === 'ellesmereui') return 'required'
  return 'optional'
}

export function addonGroupSubtitle(group: AddonGroupKey): string {
  if (group === 'required') return 'Required'
  if (group === 'wowup') return 'WowUp'
  return 'Optional'
}

export function groupAddonChips<T extends { key: string, kind: AddonGroupKey }>(chips: T[]): Array<{ key: AddonGroupKey, label: string, items: T[] }> {
  const order: AddonGroupKey[] = ['required', 'optional', 'wowup']
  const buckets: Record<AddonGroupKey, T[]> = { required: [], optional: [], wowup: [] }
  for (const chip of chips) buckets[chip.kind].push(chip)
  return order
    .filter(k => buckets[k].length > 0)
    .map(k => ({ key: k, label: addonGroupSubtitle(k), items: buckets[k] }))
}

/** First N markdown bullets from changelog body (strip bold markers). */
export function changelogPreviewBullets(content: string, max = 3): string[] {
  if (!content) return []
  const out: string[] = []
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*[-*]\s+(.+)$/)
    if (!m?.[1]) continue
    const cleaned = m[1]
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim()
    if (cleaned) out.push(cleaned)
    if (out.length >= max) break
  }
  return out
}

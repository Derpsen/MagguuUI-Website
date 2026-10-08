/**
 * Canonical addon metadata keyed by slug.
 *
 * - `tocName` is what appears in MagguuUI.toc Dependencies/OptionalDeps.
 * - `slug` is the website-stable identifier (kebab-case).
 * - Auto-sync looks up entries here when a new tocName appears in the .toc;
 *   if absent it falls back to a derived slug + minimal defaults so the addon
 *   still shows up on the site.
 *
 * Manual-only entries (no tocName) are seeded once and never touched by the
 * .toc sync — BigWigs, Northern Sky, WIM, and Waypoint UI are the current
 * examples: they are not TOC dependencies, MagguuUI imports them when present.
 * Whisper Messenger is the WowUp optional chat addon. WIM stays a companion
 * import and is no longer in the WowUp pack.
 */

export interface AddonDefault {
  slug: string
  tocName?: string
  aliases?: string[]
  name: string
  category: 'required' | 'core' | 'optional'
  emoji: string
  description: string
  url?: string
  isVisible?: boolean
  sortOrder: number
}

const CF = 'https://www.curseforge.com/wow/addons'

export const ADDON_DEFAULTS: AddonDefault[] = [
  {
    slug: 'ellesmereui',
    tocName: 'EllesmereUI',
    name: 'EllesmereUI',
    category: 'required',
    emoji: '🎨',
    description: 'Required. Install it from CurseForge, Wago, or WoWInterface. MagguuUI needs EllesmereUI 9.0.6 or newer.',
    url: `${CF}/ellesmereui`,
    sortOrder: 0,
  },
  {
    slug: 'bigwigs',
    name: 'BigWigs',
    category: 'core',
    emoji: '⏱️',
    description: 'Optional boss timers. MagguuUI applies its BigWigs profile when BigWigs is installed.',
    url: `${CF}/big-wigs`,
    sortOrder: 1,
  },
  {
    slug: 'littlewigs',
    name: 'LittleWigs',
    category: 'optional',
    emoji: '⏱️',
    description: 'Optional dungeon timers for BigWigs. Listed with the WowUp starter addons in Setup.',
    url: `${CF}/little-wigs`,
    sortOrder: 1,
  },
  {
    slug: 'northern-sky-raid-tools',
    name: 'Northern Sky Raid Tools',
    category: 'optional',
    emoji: '🧭',
    description: 'Optional raid notes. MagguuUI applies its profile when Northern Sky is installed.',
    url: `${CF}/northern-sky-raid-tools`,
    sortOrder: 0,
  },
  {
    slug: 'wim',
    name: 'WIM',
    category: 'optional',
    emoji: '💬',
    description: 'Optional whisper windows. MagguuUI applies its WIM settings when WIM is installed.',
    url: `${CF}/wim-3`,
    sortOrder: 2,
  },
  {
    slug: 'whisper-messenger',
    name: 'Whisper Messenger',
    category: 'optional',
    emoji: '💬',
    description: 'Optional whisper windows. MagguuUI applies its profile when Whisper Messenger is installed.',
    url: `${CF}/whisper-messenger`,
    sortOrder: 2,
  },
  {
    slug: 'waypointui',
    name: 'Waypoint UI',
    category: 'optional',
    emoji: '📍',
    description: 'Optional in-world waypoints. MagguuUI applies its settings when Waypoint UI is installed.',
    url: `${CF}/waypointui`,
    sortOrder: 3,
  },
  {
    slug: 'exboss',
    aliases: ['EXBOSS'],
    name: 'EXBoss',
    category: 'optional',
    emoji: '📣',
    description: 'Optional boss callouts. MagguuUI applies its EXBoss setup when EXBoss is installed.',
    url: `${CF}/exboss`,
    sortOrder: 4,
  },
  {
    slug: 'excore',
    aliases: ['ExwindCore', 'EXCore', 'ExCore'],
    name: 'EXCore',
    category: 'optional',
    emoji: '🧩',
    description: 'Optional library used with EXBoss. Listed with the WowUp starter addons in Setup.',
    url: `${CF}/excore`,
    sortOrder: 5,
  },
  {
    slug: 'handynotes',
    name: 'HandyNotes',
    category: 'optional',
    emoji: '📌',
    description: 'Optional map notes. MagguuUI applies its HandyNotes settings when HandyNotes is installed.',
    url: `${CF}/handynotes`,
    sortOrder: 6,
  },
  {
    slug: 'talent-tree-tweaks',
    name: 'Talent Tree Tweaks',
    category: 'optional',
    emoji: '🌳',
    description: 'Optional talent helpers. MagguuUI applies its settings when Talent Tree Tweaks is installed.',
    url: `${CF}/talent-tree-tweaks`,
    sortOrder: 7,
  },
  {
    slug: 'gtfo',
    name: 'GTFO',
    category: 'optional',
    emoji: '⚠️',
    description: 'Optional ground warnings. MagguuUI applies its settings when GTFO is installed.',
    url: `${CF}/gtfo`,
    sortOrder: 8,
  },
  {
    slug: 'bugsack',
    name: 'BugSack',
    category: 'optional',
    emoji: '🐛',
    description: 'Optional error sack. MagguuUI applies its settings when BugSack is installed.',
    url: `${CF}/bugsack`,
    sortOrder: 9,
  },
  {
    slug: 'premade-groups-filter',
    name: 'Premade Groups Filter',
    category: 'optional',
    emoji: '🔍',
    description: 'Optional group-finder filters. MagguuUI applies its settings when Premade Groups Filter is installed.',
    url: `${CF}/premade-groups-filter`,
    sortOrder: 10,
  },
  {
    slug: 'smart-reminders',
    aliases: ['NaowhSmartReminders'],
    name: 'Smart Reminders',
    category: 'optional',
    emoji: '⏰',
    description: 'Optional combat reminders. MagguuUI applies its pack when Smart Reminders is installed.',
    url: `${CF}/naowh-smart-reminders`,
    sortOrder: 11,
  },
]

export const RETIRED_ADDON_SLUGS = [
  'blizzard-editmode',
  'elvui',
  'plater',
  'details',
  'bettercooldownmanager',
  'ayije-cdm',
  'method-raid-tools',
  'platynator',
  'details-ilvldisplay',
  'buffreminders',
  'targetedspells',
  'minicc',
  'minimalist-cooldown-edge',
  'elvui-windtools',
  'exwindtools',
  'handynotes-mapnotes',
  'easy-experience-bar',
  'wim-elvui-skin',
  'exwind-core',
  'magguu-ui-data',
  'elvui-anchor',
  'buggrabber',
  'groupfinderflags',
  'falcon',
  'cursor-trail',
  'mplustimer',
  'plumber',
  'exboss-data',
  'blizzi-interrupts',
  'bli-zzi-interrupts',
  'keystoneloot',
] as const

export function isRetiredAddonSlug(slug: string): boolean {
  return (RETIRED_ADDON_SLUGS as readonly string[]).includes(slug)
}

const BY_TOC_NAME = (() => {
  const map = new Map<string, AddonDefault>()
  for (const def of ADDON_DEFAULTS) {
    if (def.tocName) map.set(def.tocName.toLowerCase(), def)
    for (const alias of def.aliases ?? []) {
      map.set(alias.toLowerCase(), def)
    }
  }
  return map
})()

export function findAddonDefaultByTocName(tocName: string): AddonDefault | undefined {
  return BY_TOC_NAME.get(tocName.toLowerCase())
}

export function deriveSlugFromTocName(tocName: string): string {
  return tocName
    .replace(/^!/, '')
    .replace(/_/g, '-')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

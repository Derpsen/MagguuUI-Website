/**
 * Canonical addon metadata keyed by slug.
 *
 * - `tocName` is what appears in MagguuUI.toc OptionalDeps/RequiredDeps.
 * - `slug` is the website-stable identifier (kebab-case).
 * - Auto-sync looks up entries here when a new tocName appears in the .toc;
 *   if absent it falls back to a derived slug + minimal defaults so the addon
 *   still shows up on the site.
 *
 * Manual-only entries (no tocName) are seeded once and never touched by the
 * .toc sync — Blizzard EditMode is the canonical example: it has no OptionalDep
 * because it ships with WoW itself.
 */

export interface AddonDefault {
  slug: string
  tocName?: string                    // matches OptionalDeps/RequiredDeps token
  aliases?: string[]                   // additional tocName variants (e.g. legacy renames)
  name: string                         // user-facing label
  category: 'required' | 'core' | 'optional'
  emoji: string
  description: string
  url?: string
  isVisible?: boolean                  // default true; libs default to false
  sortOrder: number
}

const CF = 'https://www.curseforge.com/wow/addons'

export const ADDON_DEFAULTS: AddonDefault[] = [
  // ─── Required ────────────────────────────────────
  {
    slug: 'elvui',
    tocName: 'ElvUI',
    name: 'ElvUI',
    category: 'required',
    emoji: '🎨',
    description: 'The complete UI replacement framework that MagguuUI is built on. Handles action bars, unit frames, chat, bags, maps, and more. Required version: 15.00 or higher.',
    url: 'https://tukui.org/elvui',
    sortOrder: 0,
  },

  // ─── Core ────────────────────────────────────────
  {
    slug: 'plater',
    tocName: 'Plater',
    name: 'Plater',
    category: 'core',
    emoji: '🎯',
    description: 'Nameplate addon with per-mob customization, scripting, and mod support.',
    url: `${CF}/plater-nameplates`,
    sortOrder: 0,
  },
  {
    slug: 'bigwigs',
    tocName: 'BigWigs',
    name: 'BigWigs',
    category: 'core',
    emoji: '⏱️',
    description: 'Boss mod for raid and dungeon encounters with timers, alerts, and proximity.',
    url: `${CF}/big-wigs`,
    sortOrder: 1,
  },
  {
    slug: 'details',
    tocName: 'Details',
    name: 'Details!',
    category: 'core',
    emoji: '📊',
    description: 'Damage and healing meter with extensive statistics and plugin support.',
    url: `${CF}/details`,
    sortOrder: 2,
  },
  {
    slug: 'bettercooldownmanager',
    tocName: 'BetterCooldownManager',
    name: 'BetterCooldownManager',
    category: 'core',
    emoji: '⚡',
    description: 'Tracks party and raid cooldowns with a clean bar/icon display.',
    url: `${CF}/bettercooldownmanager`,
    sortOrder: 3,
  },
  {
    slug: 'ayije-cdm',
    tocName: 'Ayije_CDM',
    name: 'Ayije CDM',
    category: 'core',
    emoji: '⏳',
    description: 'Cooldown manager with a compact interface for tracking group abilities.',
    url: 'https://wago.io/ayijeCDM',
    sortOrder: 4,
  },
  {
    slug: 'method-raid-tools',
    tocName: 'MRT',
    name: 'Method Raid Tools',
    category: 'core',
    emoji: '📋',
    description: 'Raid notes, cooldown assignments, marks, raid groups, and timers — the competitive-raid toolkit.',
    url: `${CF}/method-raid-tools`,
    sortOrder: 5,
  },
  {
    slug: 'blizzard-editmode',
    name: 'Blizzard EditMode',
    category: 'core',
    emoji: '🖼️',
    description: 'Built-in WoW layout system — MagguuUI applies a pre-configured layout automatically.',
    sortOrder: 6,
  },

  // ─── Optional ────────────────────────────────────
  {
    slug: 'platynator',
    tocName: 'Platynator',
    name: 'Platynator',
    category: 'optional',
    emoji: '🛡️',
    description: 'Additional nameplate tweaks and color coding for Plater.',
    url: `${CF}/platynator`,
    sortOrder: 0,
  },
  {
    slug: 'northern-sky-raid-tools',
    tocName: 'NorthernSkyRaidTools',
    name: 'Northern Sky Raid Tools',
    category: 'optional',
    emoji: '🧭',
    description: 'Raid assignment and note distribution tool for organized groups.',
    url: `${CF}/northern-sky-raid-tools`,
    sortOrder: 1,
  },
  {
    slug: 'details-ilvldisplay',
    tocName: 'Details_iLvlDisplay',
    name: 'Details iLvl Display',
    category: 'optional',
    emoji: '🔢',
    description: 'Adds item level and tier-set bonus columns to Details! bars.',
    url: `${CF}/details-ilvldisplay`,
    sortOrder: 2,
  },
  {
    slug: 'buffreminders',
    tocName: 'BuffReminders',
    name: 'BuffReminders',
    category: 'optional',
    emoji: '💡',
    description: 'Reminds you to apply missing buffs like food, flask, or rune.',
    url: `${CF}/buffreminders`,
    sortOrder: 3,
  },
  {
    slug: 'targetedspells',
    tocName: 'TargetedSpells',
    name: 'TargetedSpells',
    category: 'optional',
    emoji: '🔮',
    description: 'Shows incoming spells targeted at you with visual indicators.',
    url: `${CF}/targetedspells`,
    sortOrder: 4,
  },
  {
    slug: 'minicc',
    tocName: 'MiniCC',
    name: 'MiniCC',
    category: 'optional',
    emoji: '🕐',
    description: 'Lightweight cooldown count text on action bar buttons.',
    url: `${CF}/minicc`,
    sortOrder: 5,
  },
  {
    slug: 'minimalist-cooldown-edge',
    tocName: 'MinimalistCooldownEdge',
    aliases: ['MiniCE'],
    name: 'Minimalist Cooldown Edge',
    category: 'optional',
    emoji: '🕑',
    description: 'Minimalist cooldown edge animation for action bar buttons.',
    url: `${CF}/minimalist-cooldown-edge`,
    sortOrder: 6,
  },
  {
    slug: 'elvui-windtools',
    tocName: 'ElvUI_WindTools',
    name: 'ElvUI WindTools',
    category: 'optional',
    emoji: '🌬️',
    description: 'Feature-rich ElvUI plugin with extra modules, skins, and QoL tweaks.',
    url: `${CF}/elvui-windtools`,
    sortOrder: 7,
  },
  {
    slug: 'exwind-core',
    tocName: 'ExwindCore',
    name: 'ExwindCore',
    category: 'optional',
    emoji: '🧩',
    description: 'Shared core library required by ExwindTools and related plugins.',
    url: `${CF}/exwindcore`,
    sortOrder: 8,
  },
  {
    slug: 'exwindtools',
    tocName: 'ExwindTools',
    name: 'ExwindTools',
    category: 'optional',
    emoji: '🔧',
    description: 'Extended toolkit with additional UI modules and utilities.',
    url: `${CF}/exwindtools`,
    sortOrder: 9,
  },
  {
    slug: 'handynotes',
    tocName: 'HandyNotes',
    name: 'HandyNotes',
    category: 'optional',
    emoji: '📍',
    description: 'Pins custom notes and collectible locations on your world map.',
    url: `${CF}/handynotes`,
    sortOrder: 10,
  },
  {
    slug: 'handynotes-mapnotes',
    tocName: 'HandyNotes_MapNotes',
    name: 'HandyNotes MapNotes',
    category: 'optional',
    emoji: '🗺️',
    description: 'Adds instance entrances, portals, and transport icons to the map.',
    url: `${CF}/handynotes-mapnotes`,
    sortOrder: 11,
  },
  {
    slug: 'easy-experience-bar',
    tocName: 'EasyExperienceBar',
    name: 'EasyExperienceBar',
    category: 'optional',
    emoji: '📈',
    description: 'Clean, configurable experience and reputation bar replacement.',
    url: `${CF}/easy-experience-bar`,
    sortOrder: 12,
  },
  {
    slug: 'wim',
    tocName: 'WIM',
    name: 'WIM',
    category: 'optional',
    emoji: '💬',
    description: 'WoW Instant Messenger — gives whispers their own chat windows.',
    url: `${CF}/wim-3`,
    sortOrder: 13,
  },
  {
    slug: 'wim-elvui-skin',
    tocName: 'WIM_ElvUI_Skin',
    name: 'WIM ElvUI Skin',
    category: 'optional',
    emoji: '🎭',
    description: 'ElvUI-styled skin for WIM chat windows.',
    sortOrder: 14,
    isVisible: false,
  },
  {
    slug: 'elvui-anchor',
    tocName: 'ElvUI_Anchor',
    name: 'ElvUI Anchor',
    category: 'optional',
    emoji: '⚓',
    description: 'Helper plugin for anchoring custom frames to ElvUI elements.',
    sortOrder: 15,
    isVisible: false,
  },
  {
    slug: 'gtfo',
    tocName: 'GTFO',
    name: 'GTFO',
    category: 'optional',
    emoji: '🚨',
    description: 'Plays an alert sound when you stand in fire or other bad stuff.',
    url: `${CF}/gtfo`,
    sortOrder: 16,
  },
  {
    slug: 'bugsack',
    tocName: 'BugSack',
    name: 'BugSack',
    category: 'optional',
    emoji: '🪲',
    description: 'Collects Lua errors silently so they don\'t interrupt gameplay.',
    url: `${CF}/bugsack`,
    sortOrder: 17,
  },
  {
    slug: 'buggrabber',
    tocName: '!BugGrabber',
    name: '!BugGrabber',
    category: 'optional',
    emoji: '🐞',
    description: 'Library that captures Lua errors for BugSack to display.',
    url: `${CF}/bug-grabber`,
    sortOrder: 18,
    isVisible: false,
  },
  {
    slug: 'groupfinderflags',
    tocName: 'GroupfinderFlags',
    name: 'GroupfinderFlags',
    category: 'optional',
    emoji: '🏁',
    description: 'Adds visual flags and filters to the group finder UI.',
    url: `${CF}/groupfinderflags`,
    sortOrder: 19,
  },
  {
    slug: 'falcon',
    tocName: 'Falcon',
    name: 'Falcon',
    category: 'optional',
    emoji: '🦅',
    description: 'Skyriding companion addon with speed and ability tracking.',
    url: `${CF}/falcon`,
    sortOrder: 20,
  },
  {
    slug: 'cursor-trail',
    tocName: 'CursorTrail',
    name: 'CursorTrail',
    category: 'optional',
    emoji: '✨',
    description: 'Adds a visual trail effect to your mouse cursor in-game.',
    url: `${CF}/cursor-trail`,
    sortOrder: 21,
  },
  {
    slug: 'mplustimer',
    tocName: 'MPlusTimer',
    name: 'MPlusTimer',
    category: 'optional',
    emoji: '⏲️',
    description: 'Mythic+ dungeon timer with detailed split tracking per boss.',
    url: `${CF}/mplustimer`,
    sortOrder: 22,
  },
  {
    slug: 'plumber',
    tocName: 'Plumber',
    name: 'Plumber',
    category: 'optional',
    emoji: '🔩',
    description: 'Quality-of-life tweaks for Blizzard UI elements like Delves and warband bank.',
    url: `${CF}/plumber`,
    sortOrder: 23,
  },
  {
    slug: 'waypointui',
    tocName: 'WaypointUI',
    name: 'WaypointUI',
    category: 'optional',
    emoji: '📌',
    description: 'Customizable waypoint arrow and coordinate display.',
    url: `${CF}/waypointui`,
    sortOrder: 24,
  },
  {
    slug: 'talent-tree-tweaks',
    tocName: 'TalentTreeTweaks',
    name: 'TalentTreeTweaks',
    category: 'optional',
    emoji: '🌳',
    description: 'Enhancements for the talent tree UI with better search and import tools.',
    url: `${CF}/talent-tree-tweaks`,
    sortOrder: 25,
  },
]

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

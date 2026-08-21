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
 * .toc sync — Blizzard EditMode, BigWigs, and Northern Sky are the current
 * examples: they are not TOC dependencies, MagguuUI configures them when present.
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
    description: 'Required UI replacement. MagguuUI is a native EllesmereUI module and needs version 7.9.5 or newer.',
    url: `${CF}/ellesmereui`,
    sortOrder: 0,
  },
  {
    slug: 'blizzard-editmode',
    name: 'Blizzard Edit Mode',
    category: 'core',
    emoji: '🖼️',
    description: 'Built-in WoW layout editor. MagguuUI copies a 4K layout for you to paste; addon code never writes Edit Mode itself.',
    sortOrder: 0,
  },
  {
    slug: 'bigwigs',
    name: 'BigWigs',
    category: 'core',
    emoji: '⏱️',
    description: 'Optional boss-mod profile. MagguuUI registers a native MagguuUI bar style and rewrites callouts onto bundled media.',
    url: `${CF}/big-wigs`,
    sortOrder: 1,
  },
  {
    slug: 'littlewigs',
    name: 'LittleWigs',
    category: 'optional',
    emoji: '⏱️',
    description: 'Dungeon timers for BigWigs. Included in the WowUp starter pack; MagguuUI does not ship a separate LittleWigs profile.',
    url: `${CF}/little-wigs`,
    sortOrder: 1,
  },
  {
    slug: 'northern-sky-raid-tools',
    name: 'Northern Sky Raid Tools',
    category: 'optional',
    emoji: '🧭',
    description: 'Optional raid notes and alerts. MagguuUI imports the MagguuUI profile when NSRT is installed.',
    url: `${CF}/northern-sky-raid-tools`,
    sortOrder: 0,
  },
]

export const RETIRED_ADDON_SLUGS = [
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
  'exwind-core',
  'exwindtools',
  'handynotes',
  'handynotes-mapnotes',
  'easy-experience-bar',
  'wim',
  'wim-elvui-skin',
  'elvui-anchor',
  'gtfo',
  'bugsack',
  'buggrabber',
  'groupfinderflags',
  'falcon',
  'cursor-trail',
  'mplustimer',
  'plumber',
  'waypointui',
  'talent-tree-tweaks',
  'exboss',
  'exboss-data',
  'blizzi-interrupts',
  'bli-zzi-interrupts',
] as const

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

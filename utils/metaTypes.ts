/**
 * Shared shapes for the Meta snapshot (SQLite payload and public API).
 * Compact aggregates only — no character names are stored or exposed.
 */

export const META_REGION = 'eu' as const
export const META_FOCUS = 'mythic-plus' as const
export const META_SNAPSHOT_TTL_MS = 30 * 24 * 60 * 60 * 1000
/** Top entries in a per-slot or per-stat list (spec: 3–5). */
export const META_TOP_SLOT_ITEMS = 5
/** Talent heatmaps can list a few more nodes than a gear slot. */
export const META_TOP_ITEMS = 16
/** Samples below this are shown greyed out, not hidden. */
export const META_MIN_SAMPLE = 20

export type MetaTalentTree = 'class' | 'spec' | 'hero'
export type MetaTalentBand = 'core' | 'flexible' | 'rare'

export type MetaTalentCount = {
  id: number
  name: string
  count: number
  share: number
  tree: MetaTalentTree
  band: MetaTalentBand
}

export type MetaLoadout = {
  code: string
  count: number
  share: number
  heroTree: { id: number, name: string } | null
}

export type MetaHeroSplit = {
  id: number
  name: string
  count: number
  share: number
}

export type MetaGearCount = {
  slot: string
  itemId: number
  name: string
  count: number
  share: number
  quality: string | null
  setName: string | null
  crafted: boolean
  embellished: boolean
  enchant: { id: number, name: string } | null
  gems: Array<{ id: number, name: string }>
}

export type MetaSlotGroup = {
  slot: string
  items: MetaGearCount[]
}

export type MetaStatBar = {
  id: string
  name: string
  average: number
}

export type MetaEnchantGem = {
  id: number
  name: string
  count: number
  share: number
}

export type MetaRaceCount = {
  id: number
  name: string
  count: number
  share: number
}

export type MetaKeyLevels = {
  min: number
  max: number
  average: number
}

export type MetaTalentGroups = {
  class: MetaTalentCount[]
  spec: MetaTalentCount[]
  hero: MetaTalentCount[]
}

export type MetaSpecSummary = {
  slug: string
  name: string
  characterCount: number
  share: number
  profileCount: number
  belowMinSample: boolean
  keyLevels: MetaKeyLevels | null
  heroSplit: MetaHeroSplit[]
  loadouts: MetaLoadout[]
  talents: MetaTalentGroups
  stats: MetaStatBar[]
  gearSlots: MetaSlotGroup[]
  trinkets: MetaGearCount[]
  rings: MetaGearCount[]
  embellishments: MetaGearCount[]
  enchants: MetaEnchantGem[]
  gems: MetaEnchantGem[]
  races: MetaRaceCount[]
}

export type MetaClassSummary = {
  slug: string
  name: string
  characterCount: number
  specs: MetaSpecSummary[]
}

export type MetaFreshness = {
  fetchedAt: number
  characters: number
  keyLevels: { min: number, max: number } | null
  region: typeof META_REGION
  source: 'blizzard'
}

export type MetaSnapshotPayload = {
  region: typeof META_REGION
  focus: typeof META_FOCUS
  season: { id: number, name: string } | null
  period: { id: number } | null
  freshness: MetaFreshness
  sampled: { realms: number, leaderboards: number, characters: number, profiles: number }
  classes: MetaClassSummary[]
}

export function talentBand(share: number): MetaTalentBand {
  if (share >= 0.8) return 'core'
  if (share >= 0.2) return 'flexible'
  return 'rare'
}

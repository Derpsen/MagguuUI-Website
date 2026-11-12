/**
 * Shared shapes for the Meta snapshot (SQLite payload and public API).
 * Compact aggregates only — no player names, realm names, or character ids.
 * Display strings use `label` (never a `name` key) so payloads stay free of
 * the reserved keys `name`, `realm`, and `character`.
 */

export const META_REGION = 'eu' as const
export const META_FOCUS = 'mythic-plus' as const
export const META_SNAPSHOT_TTL_MS = 30 * 24 * 60 * 60 * 1000
/** Top entries in a per-slot or per-stat list (spec: 3–5). */
export const META_TOP_SLOT_ITEMS = 5
/** Talent heatmaps can list a few more nodes than a gear slot. */
export const META_TOP_ITEMS = 16
/** Current Mythic+ period plus this many previous periods. */
export const META_PREVIOUS_PERIODS = 2
/** Best-build and headline figures require at least this many sampled players in the spec. */
export const META_MIN_BUILD_SAMPLE = 50
/** A slot item below this count gets a low-sample badge. */
export const META_MIN_ITEM_SAMPLE = 20
/** Below this, the spec shows "Collecting data" and no figures. */
export const META_MIN_SHOW_SAMPLE = 10
/** A nightly run is only `ok` when at least this share of planned profile calls succeeded. */
export const META_MIN_PROFILE_SUCCESS_RATIO = 0.7
/** 429 responses above this share of HTTP calls fail the promote sanity gate. */
export const META_MAX_429_RATE = 0.05
/** Leaderboard fetches must succeed at at least this share to promote. */
export const META_MIN_LEADERBOARD_SUCCESS_RATIO = 0.9
/** Total n may not drop below this share of the previous snapshot. */
export const META_SANITY_N_FLOOR_RATIO = 0.5
/** A spec with at least this many players must not flip to n = 0 (build threshold). */
export const META_SANITY_SPEC_FLIP_N = META_MIN_BUILD_SAMPLE
/** Default profile sample per spec (overridable via NUXT_META_SAMPLE_PER_SPEC). */
export const META_SAMPLE_PER_SPEC = 200
/** Max profile attempts per spec before giving up (overridable via NUXT_META_MAX_ATTEMPTS_PER_SPEC). */
export const META_MAX_ATTEMPTS_PER_SPEC = 400
/** Target request rate for the nightly (hard cap 50/s). */
export const META_MAX_RPS = 40
/** In-flight Blizzard requests during the nightly. Kept modest so a 429 can pause the gate before a burst slips through. */
export const META_CONCURRENCY = 8
/** Per-request timeout in ms. */
export const META_REQUEST_TIMEOUT_MS = 20_000
/** Stale lock / run deadline. 200 profiles/spec takes about 15–20 minutes. */
export const META_JOB_TIMEOUT_MS = 45 * 60 * 1000

export type MetaTalentTree = 'class' | 'spec' | 'hero'
export type MetaTalentBand = 'core' | 'flexible' | 'rare'
export type MetaSpecState = 'empty' | 'collecting' | 'low-sample' | 'ok'

export function specDataState(n: number): MetaSpecState {
  if (n <= 0) return 'empty'
  if (n < META_MIN_SHOW_SAMPLE) return 'collecting'
  if (n < META_MIN_BUILD_SAMPLE) return 'low-sample'
  return 'ok'
}

export function itemIsLowSample(count: number): boolean {
  return count < META_MIN_ITEM_SAMPLE
}

export type MetaTalentCount = {
  id: number
  label: string
  count: number
  share: number
  tree: MetaTalentTree
  band: MetaTalentBand
  node: number | null
  spellId: number | null
  icon: string | null
  /** True when the pick is not in the published static tree layout. */
  unmapped: boolean
}

export type MetaLoadout = {
  code: string
  count: number
  share: number
  heroTree: { id: number, label: string } | null
  treeHash: string | null
}

export type MetaHeroSplit = {
  id: number
  label: string
  count: number
  share: number
}

export type MetaGearCount = {
  slot: string
  itemId: number
  label: string
  count: number
  share: number
  quality: string | null
  setName: string | null
  crafted: boolean
  embellished: boolean
  ilvl: number | null
  source: string | null
  /** Icon filename (no host), e.g. "inv_helm_cinders". Null when unknown. */
  icon: string | null
  lowSample: boolean
  enchant: { id: number, label: string } | null
  gems: Array<{ id: number, label: string }>
}

export type MetaSlotGroup = {
  slot: string
  items: MetaGearCount[]
}

export type MetaStatBar = {
  id: string
  label: string
  average: number
}

export type MetaEnchantGem = {
  id: number
  label: string
  count: number
  share: number
}

export type MetaRaceCount = {
  id: number
  label: string
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

/** Talent counts for profiles that used a given hero tree. */
export type MetaHeroTalentGroup = {
  heroTree: { id: number, label: string }
  n: number
  talents: MetaTalentGroups
}


export type MetaTalentLayoutChoice = {
  talentId: number
  label: string
  spellId: number | null
}

export type MetaTalentLayoutNode = {
  node: number
  row: number | null
  col: number | null
  type: string | null
  maxRank: number
  unlocks: number[]
  choices: MetaTalentLayoutChoice[]
}

export type MetaTalentLayout = {
  class: MetaTalentLayoutNode[]
  spec: MetaTalentLayoutNode[]
  hero: Array<{ id: number, label: string, nodes: MetaTalentLayoutNode[] }>
}

export type MetaSpecSummary = {
  slug: string
  label: string
  n: number
  share: number
  profileCount: number
  /** n === 0 */
  empty: boolean
  /** n > 0 && n < META_MIN_SHOW_SAMPLE (10) — show "Collecting data", no figures. */
  collecting: boolean
  /** n < META_MIN_BUILD_SAMPLE (50) — low-sample badge, no best-build claim. */
  lowSample: boolean
  /** Set only when n >= META_MIN_BUILD_SAMPLE; otherwise null. */
  bestBuild: MetaLoadout | null
  keyLevels: MetaKeyLevels | null
  heroSplit: MetaHeroSplit[]
  loadouts: MetaLoadout[]
  talents: MetaTalentGroups
  /** Talent counts split by hero tree (empty when none were sampled). */
  talentsByHero: MetaHeroTalentGroup[]
  /** Static tree layout for the heatmap (optional in older fixtures). */
  talentLayout: MetaTalentLayout | null
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
  label: string
  n: number
  specs: MetaSpecSummary[]
}

export type MetaFreshness = {
  fetchedAt: number
  players: number
  keyLevels: { min: number, max: number } | null
  region: typeof META_REGION
  source: 'blizzard'
}

export type MetaTalentTreeState = {
  hash: string | null
  build: string | null
}

export type MetaPeriods = {
  current: { id: number }
  included: Array<{ id: number }>
}

/** Shown on the page as the data basis (EU, season, periods, sample, key range). */
export type MetaDataBasis = {
  region: typeof META_REGION
  focus: typeof META_FOCUS
  season: { id: number, label: string } | null
  periods: MetaPeriods | null
  talentTree: MetaTalentTreeState | null
  keyLevels: { min: number, max: number } | null
  players: number
  profiles: number
  source: 'blizzard'
}

export type MetaSnapshotPayload = {
  region: typeof META_REGION
  focus: typeof META_FOCUS
  season: { id: number, label: string } | null
  periods: MetaPeriods | null
  talentTree: MetaTalentTreeState | null
  freshness: MetaFreshness
  basis: MetaDataBasis
  sampled: {
    realms: number
    leaderboards: number
    players: number
    profiles: number
    skipped404: number
    specMismatch: number
    unknownTalentNodes: number
  }
  classes: MetaClassSummary[]
}

export function talentBand(share: number): MetaTalentBand {
  if (share >= 0.8) return 'core'
  if (share >= 0.2) return 'flexible'
  return 'rare'
}

export function applySpecFlags<T extends { n: number, loadouts: MetaLoadout[], bestBuild?: MetaLoadout | null }>(spec: T): T & Pick<MetaSpecSummary, 'empty' | 'collecting' | 'lowSample' | 'bestBuild'> {
  const state = specDataState(spec.n)
  return {
    ...spec,
    empty: state === 'empty',
    collecting: state === 'collecting',
    lowSample: state !== 'ok',
    bestBuild: state === 'ok' ? (spec.bestBuild ?? spec.loadouts[0] ?? null) : null,
  }
}

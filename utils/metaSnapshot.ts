/**
 * Parse and validate a Meta snapshot payload (SQLite JSON / fixture).
 * Compact aggregates only — reserved keys `name`, `realm`, and `character`
 * (and any player-name keys) are rejected.
 */
import type {
  MetaClassSummary,
  MetaDataBasis,
  MetaEnchantGem,
  MetaFreshness,
  MetaGearCount,
  MetaHeroSplit,
  MetaKeyLevels,
  MetaLoadout,
  MetaPeriods,
  MetaRaceCount,
  MetaSlotGroup,
  MetaSnapshotPayload,
  MetaSpecSummary,
  MetaStatBar,
  MetaTalentBand,
  MetaTalentCount,
  MetaTalentGroups,
  MetaTalentTree,
  MetaTalentTreeState,
} from './metaTypes'
import { META_FOCUS, META_MIN_BUILD_SAMPLE, META_REGION, specDataState } from './metaTypes'

const FORBIDDEN_KEYS = new Set([
  'name',
  'realm',
  'character',
  'playerName',
  'player_name',
  'characterName',
  'character_name',
  'characterId',
  'character_id',
  'battletag',
  'battleTag',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonNeg(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0
}

function isShare(value: unknown): value is number {
  return isNonNeg(value) && value <= 1
}

function isStr(value: unknown): value is string {
  return typeof value === 'string'
}

function hasForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenKey)
  if (!isRecord(value)) return false
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) return true
    if (hasForbiddenKey(value[key])) return true
  }
  return false
}

function parseKeySpan(value: unknown): { min: number, max: number } | null {
  if (value == null) return null
  if (!isRecord(value) || !isFiniteNumber(value.min) || !isFiniteNumber(value.max)) return null
  return { min: value.min, max: value.max }
}

function parseKeyLevels(value: unknown): MetaKeyLevels | null {
  if (value == null) return null
  if (!isRecord(value) || !isFiniteNumber(value.min) || !isFiniteNumber(value.max) || !isFiniteNumber(value.average)) return null
  return { min: value.min, max: value.max, average: value.average }
}

function parseIdLabel(value: unknown): { id: number, label: string } | null {
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isStr(value.label)) return null
  return { id: value.id, label: value.label }
}

function parseSeason(value: unknown): { id: number, label: string } | null {
  if (value == null) return null
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isStr(value.label)) return null
  return { id: value.id, label: value.label }
}

function parsePeriods(value: unknown): MetaPeriods | null {
  if (value == null) return null
  if (!isRecord(value) || !isRecord(value.current) || !Array.isArray(value.included)) return null
  const currentId = value.current.id
  if (!isFiniteNumber(currentId)) return null
  const included: Array<{ id: number }> = []
  for (const item of value.included) {
    if (!isRecord(item) || !isFiniteNumber(item.id)) return null
    included.push({ id: item.id })
  }
  if (!included.some(item => item.id === currentId)) return null
  return { current: { id: currentId }, included }
}

function parseTalentTreeState(value: unknown): MetaTalentTreeState | null {
  if (value == null) return null
  if (!isRecord(value)) return null
  if (value.hash != null && !isStr(value.hash)) return null
  if (value.build != null && !isStr(value.build)) return null
  return { hash: value.hash == null ? null : value.hash, build: value.build == null ? null : value.build }
}

function parseFreshness(value: unknown): MetaFreshness | null {
  if (!isRecord(value) || !isFiniteNumber(value.fetchedAt) || !isNonNeg(value.players)) return null
  if (value.region !== META_REGION || value.source !== 'blizzard') return null
  const keyLevels = parseKeySpan(value.keyLevels)
  if (value.keyLevels != null && !keyLevels) return null
  return {
    fetchedAt: value.fetchedAt,
    players: value.players,
    keyLevels,
    region: META_REGION,
    source: 'blizzard',
  }
}

function parseLoadout(value: unknown): MetaLoadout | null {
  if (!isRecord(value) || !isStr(value.code) || !isNonNeg(value.count) || !isShare(value.share)) return null
  if (value.treeHash != null && !isStr(value.treeHash)) return null
  let heroTree: MetaLoadout['heroTree'] = null
  if (value.heroTree != null) {
    heroTree = parseIdLabel(value.heroTree)
    if (!heroTree) return null
  }
  return {
    code: value.code,
    count: value.count,
    share: value.share,
    heroTree,
    treeHash: value.treeHash == null ? null : value.treeHash,
  }
}

function parseHeroSplit(value: unknown): MetaHeroSplit | null {
  const row = parseIdLabel(value)
  if (!row || !isRecord(value) || !isNonNeg(value.count) || !isShare(value.share)) return null
  return { ...row, count: value.count, share: value.share }
}

const TREES: MetaTalentTree[] = ['class', 'spec', 'hero']
const BANDS: MetaTalentBand[] = ['core', 'flexible', 'rare']

function parseTalent(value: unknown): MetaTalentCount | null {
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isStr(value.label) || !isNonNeg(value.count) || !isShare(value.share)) return null
  if (!TREES.includes(value.tree as MetaTalentTree) || !BANDS.includes(value.band as MetaTalentBand)) return null
  return { id: value.id, label: value.label, count: value.count, share: value.share, tree: value.tree as MetaTalentTree, band: value.band as MetaTalentBand }
}

function parseTalents(value: unknown): MetaTalentGroups | null {
  if (!isRecord(value) || !Array.isArray(value.class) || !Array.isArray(value.spec) || !Array.isArray(value.hero)) return null
  const classTalents = value.class.map(parseTalent)
  const specTalents = value.spec.map(parseTalent)
  const heroTalents = value.hero.map(parseTalent)
  if (classTalents.some(item => !item) || specTalents.some(item => !item) || heroTalents.some(item => !item)) return null
  return { class: classTalents as MetaTalentCount[], spec: specTalents as MetaTalentCount[], hero: heroTalents as MetaTalentCount[] }
}

function parseGearItem(value: unknown): MetaGearCount | null {
  if (!isRecord(value) || !isStr(value.slot) || !isFiniteNumber(value.itemId) || !isStr(value.label)) return null
  if (!isNonNeg(value.count) || !isShare(value.share) || typeof value.crafted !== 'boolean' || typeof value.embellished !== 'boolean' || typeof value.lowSample !== 'boolean') return null
  if (value.quality != null && !isStr(value.quality)) return null
  if (value.setName != null && !isStr(value.setName)) return null
  if (value.ilvl != null && !isFiniteNumber(value.ilvl)) return null
  if (value.source != null && !isStr(value.source)) return null
  let enchant: MetaGearCount['enchant'] = null
  if (value.enchant != null) {
    enchant = parseIdLabel(value.enchant)
    if (!enchant) return null
  }
  if (!Array.isArray(value.gems)) return null
  const gems = value.gems.map(parseIdLabel)
  if (gems.some(item => !item)) return null
  return {
    slot: value.slot,
    itemId: value.itemId,
    label: value.label,
    count: value.count,
    share: value.share,
    quality: value.quality == null ? null : value.quality,
    setName: value.setName == null ? null : value.setName,
    crafted: value.crafted,
    embellished: value.embellished,
    ilvl: value.ilvl == null ? null : value.ilvl,
    source: value.source == null ? null : value.source,
    lowSample: value.lowSample,
    enchant,
    gems: gems as Array<{ id: number, label: string }>,
  }
}

function parseSlotGroup(value: unknown): MetaSlotGroup | null {
  if (!isRecord(value) || !isStr(value.slot) || !Array.isArray(value.items)) return null
  const items = value.items.map(parseGearItem)
  if (items.some(item => !item)) return null
  return { slot: value.slot, items: items as MetaGearCount[] }
}

function parseStat(value: unknown): MetaStatBar | null {
  if (!isRecord(value) || !isStr(value.id) || !isStr(value.label) || !isFiniteNumber(value.average)) return null
  return { id: value.id, label: value.label, average: value.average }
}

function parseEnchantGem(value: unknown): MetaEnchantGem | null {
  const row = parseIdLabel(value)
  if (!row || !isRecord(value) || !isNonNeg(value.count) || !isShare(value.share)) return null
  return { ...row, count: value.count, share: value.share }
}

function parseRace(value: unknown): MetaRaceCount | null {
  return parseEnchantGem(value)
}

function mapList<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null
  const items = value.map(parse)
  if (items.some(item => !item)) return null
  return items as T[]
}

function parseSpec(value: unknown): MetaSpecSummary | null {
  if (!isRecord(value) || !isStr(value.slug) || !isStr(value.label) || !isNonNeg(value.n) || !isShare(value.share) || !isNonNeg(value.profileCount)) return null
  if (typeof value.empty !== 'boolean' || typeof value.collecting !== 'boolean' || typeof value.lowSample !== 'boolean') return null
  const state = specDataState(value.n)
  if (value.empty !== (state === 'empty')) return null
  if (value.collecting !== (state === 'collecting')) return null
  if (value.lowSample !== (state !== 'ok')) return null
  const keyLevels = parseKeyLevels(value.keyLevels)
  if (value.keyLevels != null && !keyLevels) return null
  const heroSplit = mapList(value.heroSplit, parseHeroSplit)
  const loadouts = mapList(value.loadouts, parseLoadout)
  const talents = parseTalents(value.talents)
  const stats = mapList(value.stats, parseStat)
  const gearSlots = mapList(value.gearSlots, parseSlotGroup)
  const trinkets = mapList(value.trinkets, parseGearItem)
  const rings = mapList(value.rings, parseGearItem)
  const embellishments = mapList(value.embellishments, parseGearItem)
  const enchants = mapList(value.enchants, parseEnchantGem)
  const gems = mapList(value.gems, parseEnchantGem)
  const races = mapList(value.races, parseRace)
  if (!heroSplit || !loadouts || !talents || !stats || !gearSlots || !trinkets || !rings || !embellishments || !enchants || !gems || !races) return null
  let bestBuild: MetaLoadout | null = null
  if (value.bestBuild != null) {
    bestBuild = parseLoadout(value.bestBuild)
    if (!bestBuild) return null
  }
  if (state !== 'ok' && bestBuild) return null
  if (state === 'ok' && value.n >= META_MIN_BUILD_SAMPLE && loadouts.length > 0 && !bestBuild) return null
  return {
    slug: value.slug,
    label: value.label,
    n: value.n,
    share: value.share,
    profileCount: value.profileCount,
    empty: value.empty,
    collecting: value.collecting,
    lowSample: value.lowSample,
    bestBuild,
    keyLevels,
    heroSplit,
    loadouts,
    talents,
    stats,
    gearSlots,
    trinkets,
    rings,
    embellishments,
    enchants,
    gems,
    races,
  }
}

function parseClass(value: unknown): MetaClassSummary | null {
  if (!isRecord(value) || !isStr(value.slug) || !isStr(value.label) || !isNonNeg(value.n)) return null
  const specs = mapList(value.specs, parseSpec)
  if (!specs) return null
  return { slug: value.slug, label: value.label, n: value.n, specs }
}

function parseBasis(value: unknown, season: MetaSnapshotPayload['season'], periods: MetaPeriods | null, talentTree: MetaTalentTreeState | null, freshness: MetaFreshness, profiles: number): MetaDataBasis | null {
  if (!isRecord(value) || value.region !== META_REGION || value.focus !== META_FOCUS || value.source !== 'blizzard') return null
  if (!isNonNeg(value.players) || !isNonNeg(value.profiles)) return null
  const keyLevels = parseKeySpan(value.keyLevels)
  if (value.keyLevels != null && !keyLevels) return null
  const basisSeason = parseSeason(value.season)
  if (value.season != null && !basisSeason) return null
  const basisPeriods = parsePeriods(value.periods)
  if (value.periods != null && !basisPeriods) return null
  const basisTree = parseTalentTreeState(value.talentTree)
  if (value.talentTree != null && !basisTree) return null
  const basis: MetaDataBasis = {
    region: META_REGION,
    focus: META_FOCUS,
    season: basisSeason,
    periods: basisPeriods,
    talentTree: basisTree,
    keyLevels,
    players: value.players,
    profiles: value.profiles,
    source: 'blizzard',
  }
  if (basis.players !== freshness.players || basis.profiles !== profiles) return null
  if ((basis.season && season && basis.season.id !== season.id) || (!!basis.season !== !!season)) return null
  if ((basis.periods && periods && basis.periods.current.id !== periods.current.id) || (!!basis.periods !== !!periods)) return null
  if ((basis.talentTree && talentTree && basis.talentTree.hash !== talentTree.hash) || (!!basis.talentTree !== !!talentTree)) return null
  return basis
}

/**
 * Accept a parsed object or a JSON string. Returns null when the payload is
 * missing required fields, uses the wrong types, or contains reserved keys.
 */
export function parseMetaSnapshotPayload(input: unknown): MetaSnapshotPayload | null {
  let value = input
  if (typeof value === 'string') {
    try { value = JSON.parse(value) }
    catch { return null }
  }
  if (!isRecord(value) || hasForbiddenKey(value)) return null
  if (value.region !== META_REGION || value.focus !== META_FOCUS) return null
  const season = parseSeason(value.season)
  if (value.season != null && !season) return null
  const periods = parsePeriods(value.periods)
  if (value.periods != null && !periods) return null
  const talentTree = parseTalentTreeState(value.talentTree)
  if (value.talentTree != null && !talentTree) return null
  const freshness = parseFreshness(value.freshness)
  if (!freshness) return null
  if (!isRecord(value.sampled) || !isNonNeg(value.sampled.realms) || !isNonNeg(value.sampled.leaderboards) || !isNonNeg(value.sampled.players) || !isNonNeg(value.sampled.profiles) || !isNonNeg(value.sampled.skipped404) || !isNonNeg(value.sampled.specMismatch)) return null
  const basis = parseBasis(value.basis, season, periods, talentTree, freshness, value.sampled.profiles)
  if (!basis) return null
  const classes = mapList(value.classes, parseClass)
  if (!classes) return null
  return {
    region: META_REGION,
    focus: META_FOCUS,
    season,
    periods,
    talentTree,
    freshness,
    basis,
    sampled: {
      realms: value.sampled.realms,
      leaderboards: value.sampled.leaderboards,
      players: value.sampled.players,
      profiles: value.sampled.profiles,
      skipped404: value.sampled.skipped404,
      specMismatch: value.sampled.specMismatch,
    },
    classes,
  }
}

/**
 * Parse and validate a Meta snapshot payload (SQLite JSON / fixture).
 * Compact aggregates only — character and player names are not part of the schema.
 */
import type {
  MetaClassSummary,
  MetaEnchantGem,
  MetaFreshness,
  MetaGearCount,
  MetaHeroSplit,
  MetaKeyLevels,
  MetaLoadout,
  MetaRaceCount,
  MetaSlotGroup,
  MetaSnapshotPayload,
  MetaSpecSummary,
  MetaStatBar,
  MetaTalentBand,
  MetaTalentCount,
  MetaTalentGroups,
  MetaTalentTree,
} from './metaTypes'
import { META_FOCUS, META_REGION } from './metaTypes'

const FORBIDDEN_KEYS = new Set([
  'playerName',
  'player_name',
  'characterName',
  'character_name',
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

function parseFreshness(value: unknown): MetaFreshness | null {
  if (!isRecord(value) || !isFiniteNumber(value.fetchedAt) || !isNonNeg(value.characters)) return null
  if (value.region !== META_REGION || value.source !== 'blizzard') return null
  const keyLevels = parseKeySpan(value.keyLevels)
  if (value.keyLevels != null && !keyLevels) return null
  return {
    fetchedAt: value.fetchedAt,
    characters: value.characters,
    keyLevels,
    region: META_REGION,
    source: 'blizzard',
  }
}

function parseNamedCount(value: unknown): { id: number, name: string } | null {
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isStr(value.name)) return null
  return { id: value.id, name: value.name }
}

function parseLoadout(value: unknown): MetaLoadout | null {
  if (!isRecord(value) || !isStr(value.code) || !isNonNeg(value.count) || !isShare(value.share)) return null
  if (value.heroTree == null) return { code: value.code, count: value.count, share: value.share, heroTree: null }
  const hero = parseNamedCount(value.heroTree)
  if (!hero) return null
  return { code: value.code, count: value.count, share: value.share, heroTree: hero }
}

function parseHeroSplit(value: unknown): MetaHeroSplit | null {
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isStr(value.name) || !isNonNeg(value.count) || !isShare(value.share)) return null
  return { id: value.id, name: value.name, count: value.count, share: value.share }
}

const TREES: MetaTalentTree[] = ['class', 'spec', 'hero']
const BANDS: MetaTalentBand[] = ['core', 'flexible', 'rare']

function parseTalent(value: unknown): MetaTalentCount | null {
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isStr(value.name) || !isNonNeg(value.count) || !isShare(value.share)) return null
  if (!TREES.includes(value.tree as MetaTalentTree) || !BANDS.includes(value.band as MetaTalentBand)) return null
  return { id: value.id, name: value.name, count: value.count, share: value.share, tree: value.tree as MetaTalentTree, band: value.band as MetaTalentBand }
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
  if (!isRecord(value) || !isStr(value.slot) || !isFiniteNumber(value.itemId) || !isStr(value.name)) return null
  if (!isNonNeg(value.count) || !isShare(value.share) || typeof value.crafted !== 'boolean' || typeof value.embellished !== 'boolean') return null
  if (value.quality != null && !isStr(value.quality)) return null
  if (value.setName != null && !isStr(value.setName)) return null
  let enchant: MetaGearCount['enchant'] = null
  if (value.enchant != null) {
    enchant = parseNamedCount(value.enchant)
    if (!enchant) return null
  }
  if (!Array.isArray(value.gems)) return null
  const gems = value.gems.map(parseNamedCount)
  if (gems.some(item => !item)) return null
  return {
    slot: value.slot,
    itemId: value.itemId,
    name: value.name,
    count: value.count,
    share: value.share,
    quality: value.quality == null ? null : value.quality,
    setName: value.setName == null ? null : value.setName,
    crafted: value.crafted,
    embellished: value.embellished,
    enchant,
    gems: gems as Array<{ id: number, name: string }>,
  }
}

function parseSlotGroup(value: unknown): MetaSlotGroup | null {
  if (!isRecord(value) || !isStr(value.slot) || !Array.isArray(value.items)) return null
  const items = value.items.map(parseGearItem)
  if (items.some(item => !item)) return null
  return { slot: value.slot, items: items as MetaGearCount[] }
}

function parseStat(value: unknown): MetaStatBar | null {
  if (!isRecord(value) || !isStr(value.id) || !isStr(value.name) || !isFiniteNumber(value.average)) return null
  return { id: value.id, name: value.name, average: value.average }
}

function parseEnchantGem(value: unknown): MetaEnchantGem | null {
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isStr(value.name) || !isNonNeg(value.count) || !isShare(value.share)) return null
  return { id: value.id, name: value.name, count: value.count, share: value.share }
}

function parseRace(value: unknown): MetaRaceCount | null {
  if (!isRecord(value) || !isFiniteNumber(value.id) || !isStr(value.name) || !isNonNeg(value.count) || !isShare(value.share)) return null
  return { id: value.id, name: value.name, count: value.count, share: value.share }
}

function mapList<T>(value: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(value)) return null
  const items = value.map(parse)
  if (items.some(item => !item)) return null
  return items as T[]
}

function parseSpec(value: unknown): MetaSpecSummary | null {
  if (!isRecord(value) || !isStr(value.slug) || !isStr(value.name)) return null
  if (!isNonNeg(value.characterCount) || !isShare(value.share) || !isNonNeg(value.profileCount) || typeof value.belowMinSample !== 'boolean') return null
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
  return {
    slug: value.slug,
    name: value.name,
    characterCount: value.characterCount,
    share: value.share,
    profileCount: value.profileCount,
    belowMinSample: value.belowMinSample,
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
  if (!isRecord(value) || !isStr(value.slug) || !isStr(value.name) || !isNonNeg(value.characterCount)) return null
  const specs = mapList(value.specs, parseSpec)
  if (!specs) return null
  return { slug: value.slug, name: value.name, characterCount: value.characterCount, specs }
}

/**
 * Accept a parsed object or a JSON string. Returns null when the payload is
 * missing required fields, uses the wrong types, or contains player-name keys.
 */
export function parseMetaSnapshotPayload(input: unknown): MetaSnapshotPayload | null {
  let value = input
  if (typeof value === 'string') {
    try { value = JSON.parse(value) }
    catch { return null }
  }
  if (!isRecord(value) || hasForbiddenKey(value)) return null
  if (value.region !== META_REGION || value.focus !== META_FOCUS) return null
  let season: MetaSnapshotPayload['season'] = null
  if (value.season != null) {
    if (!isRecord(value.season) || !isFiniteNumber(value.season.id) || !isStr(value.season.name)) return null
    season = { id: value.season.id, name: value.season.name }
  }
  let period: MetaSnapshotPayload['period'] = null
  if (value.period != null) {
    if (!isRecord(value.period) || !isFiniteNumber(value.period.id)) return null
    period = { id: value.period.id }
  }
  const freshness = parseFreshness(value.freshness)
  if (!freshness) return null
  if (!isRecord(value.sampled) || !isNonNeg(value.sampled.realms) || !isNonNeg(value.sampled.leaderboards) || !isNonNeg(value.sampled.characters) || !isNonNeg(value.sampled.profiles)) return null
  const classes = mapList(value.classes, parseClass)
  if (!classes) return null
  return {
    region: META_REGION,
    focus: META_FOCUS,
    season,
    period,
    freshness,
    sampled: {
      realms: value.sampled.realms,
      leaderboards: value.sampled.leaderboards,
      characters: value.sampled.characters,
      profiles: value.sampled.profiles,
    },
    classes,
  }
}

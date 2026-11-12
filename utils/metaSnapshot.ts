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
  MetaHeroTalentGroup,
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
  MetaTalentLayout,
  MetaTalentLayoutNode,
  MetaTalentTree,
  MetaTalentTreeState,
} from './metaTypes'
import { findMetaClass, findMetaSpec } from './metaCatalog'
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
    if (FORBIDDEN_KEYS.has(key) || FORBIDDEN_KEYS.has(key.toLowerCase())) return true
    if (hasForbiddenKey(value[key])) return true
  }
  return false
}

/** Unix seconds (not milliseconds, not negative). */
function isFetchedAtSeconds(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value < 1e12
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
  if (!isRecord(value) || !isFetchedAtSeconds(value.fetchedAt) || !isNonNeg(value.players)) return null
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
  if (value.node != null && !isFiniteNumber(value.node)) return null
  if (value.spellId != null && !isFiniteNumber(value.spellId)) return null
  if (value.icon != null && !isStr(value.icon)) return null
  if (value.unmapped != null && typeof value.unmapped !== 'boolean') return null
  return {
    id: value.id,
    label: value.label,
    count: value.count,
    share: value.share,
    tree: value.tree as MetaTalentTree,
    band: value.band as MetaTalentBand,
    node: value.node == null ? null : value.node,
    spellId: value.spellId == null ? null : value.spellId,
    icon: value.icon == null ? null : value.icon,
    unmapped: value.unmapped === true,
  }
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
  if (value.icon != null && !isStr(value.icon)) return null
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
    icon: value.icon == null ? null : value.icon,
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


function parseLayoutChoice(value: unknown): { talentId: number, label: string, spellId: number | null } | null {
  if (!isRecord(value) || !isFiniteNumber(value.talentId) || !isStr(value.label)) return null
  if (value.spellId != null && !isFiniteNumber(value.spellId)) return null
  return { talentId: value.talentId, label: value.label, spellId: value.spellId == null ? null : value.spellId }
}

function parseLayoutNode(value: unknown): MetaTalentLayoutNode | null {
  if (!isRecord(value) || !isFiniteNumber(value.node) || !isNonNeg(value.maxRank) || !Array.isArray(value.unlocks) || !Array.isArray(value.choices)) return null
  if (value.row != null && !isFiniteNumber(value.row)) return null
  if (value.col != null && !isFiniteNumber(value.col)) return null
  if (value.type != null && !isStr(value.type)) return null
  if (!value.unlocks.every(item => typeof item === 'number' && Number.isFinite(item))) return null
  const choices = value.choices.map(parseLayoutChoice)
  if (choices.some(item => !item)) return null
  return {
    node: value.node,
    row: value.row == null ? null : value.row,
    col: value.col == null ? null : value.col,
    type: value.type == null ? null : value.type,
    maxRank: value.maxRank,
    unlocks: value.unlocks as number[],
    choices: choices as Array<{ talentId: number, label: string, spellId: number | null }>,
  }
}

function parseTalentLayout(value: unknown): MetaTalentLayout | null {
  if (value == null) return null
  if (!isRecord(value) || !Array.isArray(value.class) || !Array.isArray(value.spec) || !Array.isArray(value.hero)) return null
  const classNodes = value.class.map(parseLayoutNode)
  const specNodes = value.spec.map(parseLayoutNode)
  if (classNodes.some(item => !item) || specNodes.some(item => !item)) return null
  const hero = []
  for (const item of value.hero) {
    if (!isRecord(item) || !isFiniteNumber(item.id) || !isStr(item.label) || !Array.isArray(item.nodes)) return null
    const nodes = item.nodes.map(parseLayoutNode)
    if (nodes.some(node => !node)) return null
    hero.push({ id: item.id, label: item.label, nodes: nodes as MetaTalentLayoutNode[] })
  }
  return { class: classNodes as MetaTalentLayoutNode[], spec: specNodes as MetaTalentLayoutNode[], hero }
}

function parseTalentsByHero(value: unknown): MetaHeroTalentGroup[] | null {
  if (!Array.isArray(value)) return null
  const rows: MetaHeroTalentGroup[] = []
  for (const item of value) {
    if (!isRecord(item) || !isNonNeg(item.n)) return null
    const heroTree = parseIdLabel(item.heroTree)
    const talents = parseTalents(item.talents)
    if (!heroTree || !talents) return null
    rows.push({ heroTree, n: item.n, talents })
  }
  return rows
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
  const talentsByHero = value.talentsByHero == null ? [] : parseTalentsByHero(value.talentsByHero)
  let talentLayout: MetaTalentLayout | null = null
  if (value.talentLayout != null) {
    talentLayout = parseTalentLayout(value.talentLayout)
    if (!talentLayout) return null
  }
  const stats = mapList(value.stats, parseStat)
  const gearSlots = mapList(value.gearSlots, parseSlotGroup)
  const trinkets = mapList(value.trinkets, parseGearItem)
  const rings = mapList(value.rings, parseGearItem)
  const embellishments = mapList(value.embellishments, parseGearItem)
  const enchants = mapList(value.enchants, parseEnchantGem)
  const gems = mapList(value.gems, parseEnchantGem)
  const races = mapList(value.races, parseRace)
  if (!heroSplit || !loadouts || !talents || !talentsByHero || !stats || !gearSlots || !trinkets || !rings || !embellishments || !enchants || !gems || !races) return null
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
    talentsByHero,
    talentLayout,
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


function catalogSlugsAreValid(classes: MetaClassSummary[]): boolean {
  const classSlugs = new Set<string>()
  for (const cls of classes) {
    if (!findMetaClass(cls.slug) || classSlugs.has(cls.slug)) return false
    classSlugs.add(cls.slug)
    const specSlugs = new Set<string>()
    for (const spec of cls.specs) {
      if (!findMetaSpec(cls.slug, spec.slug) || specSlugs.has(spec.slug)) return false
      specSlugs.add(spec.slug)
    }
  }
  return true
}

function loadoutsMatchCurrentTree(classes: MetaClassSummary[], currentHash: string | null): boolean {
  if (!currentHash) return true
  for (const cls of classes) {
    for (const spec of cls.specs) {
      if (spec.bestBuild?.treeHash && spec.bestBuild.treeHash !== currentHash) return false
      for (const loadout of spec.loadouts) {
        if (loadout.treeHash && loadout.treeHash !== currentHash) return false
      }
    }
  }
  return true
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

function forbiddenKeyPath(value: unknown, path = '$'): string | null {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = forbiddenKeyPath(value[i], `${path}[${i}]`)
      if (hit) return hit
    }
    return null
  }
  if (!isRecord(value)) return null
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key) || FORBIDDEN_KEYS.has(key.toLowerCase())) return `${path}.${key}`
    const hit = forbiddenKeyPath(value[key], `${path}.${key}`)
    if (hit) return hit
  }
  return null
}

function explainShareOrList(label: string, value: unknown, parse: (item: unknown) => unknown): string | null {
  if (!Array.isArray(value)) return `${label} is not an array`
  for (let i = 0; i < value.length; i++) {
    const item = value[i]
    if (parse(item)) continue
    if (isRecord(item) && item.share != null && !isShare(item.share)) return `${label}[${i}].share is ${String(item.share)}`
    return `${label}[${i}] failed validation`
  }
  return null
}

function explainSpec(classSlug: string, value: unknown): string {
  const path = `classes.${classSlug}`
  if (!isRecord(value) || !isStr(value.slug)) return `${path}: missing slug`
  const specPath = `${path}/${value.slug}`
  if (!isStr(value.label) || !isNonNeg(value.n) || !isShare(value.share) || !isNonNeg(value.profileCount)) {
    if (isRecord(value) && !isShare(value.share)) return `${specPath}.share is ${String(value.share)}`
    return `${specPath}: invalid n/share/profileCount`
  }
  if (typeof value.empty !== 'boolean' || typeof value.collecting !== 'boolean' || typeof value.lowSample !== 'boolean') {
    return `${specPath}: missing empty/collecting/lowSample flags`
  }
  const state = specDataState(value.n)
  if (value.empty !== (state === 'empty') || value.collecting !== (state === 'collecting') || value.lowSample !== (state !== 'ok')) {
    return `${specPath}: sample flags do not match n=${String(value.n)}`
  }
  if (value.keyLevels != null && !parseKeyLevels(value.keyLevels)) return `${specPath}.keyLevels failed validation`
  const layout = value.talentLayout == null ? true : parseTalentLayout(value.talentLayout)
  if (!layout) return `${specPath}.talentLayout failed validation`
  if (value.bestBuild != null && !parseLoadout(value.bestBuild)) return `${specPath}.bestBuild failed validation`
  if (state !== 'ok' && value.bestBuild) return `${specPath}: bestBuild set while sample state is ${state}`
  if (state === 'ok' && value.n >= META_MIN_BUILD_SAMPLE && Array.isArray(value.loadouts) && value.loadouts.length > 0 && value.bestBuild == null) {
    return `${specPath}: missing bestBuild`
  }
  for (const [label, field, parse] of [
    ['heroSplit', value.heroSplit, parseHeroSplit],
    ['loadouts', value.loadouts, parseLoadout],
    ['stats', value.stats, parseStat],
    ['gearSlots', value.gearSlots, parseSlotGroup],
    ['trinkets', value.trinkets, parseGearItem],
    ['rings', value.rings, parseGearItem],
    ['embellishments', value.embellishments, parseGearItem],
    ['enchants', value.enchants, parseEnchantGem],
    ['gems', value.gems, parseEnchantGem],
    ['races', value.races, parseRace],
  ] as const) {
    const hit = explainShareOrList(`${specPath}.${label}`, field, parse)
    if (hit) return hit
  }
  if (!parseTalents(value.talents)) return `${specPath}.talents failed validation`
  if (value.talentsByHero != null && !parseTalentsByHero(value.talentsByHero)) return `${specPath}.talentsByHero failed validation`
  return `${specPath} failed validation`
}

/** Human-readable reason when parseMetaSnapshotPayload returns null. No player names. */
export function explainMetaSnapshotRejection(input: unknown): string {
  let value = input
  if (typeof value === 'string') {
    try { value = JSON.parse(value) }
    catch { return 'payload is not valid JSON' }
  }
  if (!isRecord(value)) return 'payload is not an object'
  const forbidden = forbiddenKeyPath(value)
  if (forbidden) return `reserved key at ${forbidden}`
  if (value.region !== META_REGION || value.focus !== META_FOCUS) return `region/focus must be ${META_REGION}/${META_FOCUS}`
  if (value.season != null && !parseSeason(value.season)) return 'season failed validation'
  if (value.periods != null && !parsePeriods(value.periods)) {
    if (isRecord(value.periods) && isRecord(value.periods.current) && Array.isArray(value.periods.included)) {
      const currentId = value.periods.current.id
      const included = value.periods.included.map((item: unknown) => isRecord(item) ? item.id : null)
      if (!included.some((id: unknown) => id === currentId)) {
        return `periods.current.id ${String(currentId)} is not in periods.included`
      }
    }
    return 'periods failed validation'
  }
  if (value.talentTree != null && !parseTalentTreeState(value.talentTree)) return 'talentTree failed validation'
  if (!parseFreshness(value.freshness)) return 'freshness failed validation'
  if (!isRecord(value.sampled)) return 'sampled failed validation'
  const sampled = value.sampled
  for (const key of ['realms', 'leaderboards', 'players', 'profiles', 'skipped404', 'specMismatch'] as const) {
    if (!isNonNeg(sampled[key])) return `sampled.${key} is invalid`
  }
  if (sampled.unknownTalentNodes != null && !isNonNeg(sampled.unknownTalentNodes)) return 'sampled.unknownTalentNodes is invalid'
  const season = parseSeason(value.season)
  const periods = parsePeriods(value.periods)
  const talentTree = parseTalentTreeState(value.talentTree)
  const freshness = parseFreshness(value.freshness)
  if (!freshness) return 'freshness failed validation'
  if (!parseBasis(value.basis, season, periods, talentTree, freshness, sampled.profiles as number)) {
    return 'basis failed validation'
  }
  if (!Array.isArray(value.classes)) return 'classes is not an array'
  for (const cls of value.classes) {
    if (parseClass(cls)) continue
    if (!isRecord(cls) || !isStr(cls.slug)) return 'a class entry is invalid'
    if (!Array.isArray(cls.specs)) return `class ${cls.slug}: specs is not an array`
    for (const spec of cls.specs) {
      if (!parseSpec(spec)) return explainSpec(cls.slug, spec)
    }
    return `class ${cls.slug} failed validation`
  }
  const classes = mapList(value.classes, parseClass)
  if (!classes) return 'classes failed validation'
  if (!catalogSlugsAreValid(classes)) return 'unknown or duplicate class/spec slug'
  if (!loadoutsMatchCurrentTree(classes, talentTree?.hash ?? null)) return 'a loadout treeHash does not match talentTree.hash'
  return 'payload failed validation'
}

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
  if (value.sampled.unknownTalentNodes != null && !isNonNeg(value.sampled.unknownTalentNodes)) return null
  const basis = parseBasis(value.basis, season, periods, talentTree, freshness, value.sampled.profiles)
  if (!basis) return null
  const classes = mapList(value.classes, parseClass)
  if (!classes) return null
  if (!catalogSlugsAreValid(classes)) return null
  if (!loadoutsMatchCurrentTree(classes, talentTree?.hash ?? null)) return null
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
      unknownTalentNodes: value.sampled.unknownTalentNodes == null ? 0 : value.sampled.unknownTalentNodes,
    },
    classes,
  }
}

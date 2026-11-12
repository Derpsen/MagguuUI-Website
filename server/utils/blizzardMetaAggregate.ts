/**
 * Pure aggregation helpers for a Meta snapshot. No HTTP, no character names
 * in the output. Used by the nightly sync and by fixture unit tests.
 */

import { META_CLASSES, findMetaClass, findMetaSpec, toMetaSlug } from '~/utils/metaCatalog'
import { decodeLoadoutHeader } from '~/utils/metaLoadout'
import {
  META_TOP_ITEMS,
  META_TOP_SLOT_ITEMS,
  applySpecFlags,
  itemIsLowSample,
  talentBand,
  type MetaClassSummary,
  type MetaEnchantGem,
  type MetaGearCount,
  type MetaHeroSplit,
  type MetaHeroTalentGroup,
  type MetaKeyLevels,
  type MetaLoadout,
  type MetaRaceCount,
  type MetaSpecSummary,
  type MetaStatBar,
  type MetaTalentCount,
  type MetaTalentGroups,
  type MetaTalentLayout,
  type MetaTalentLayoutNode,
  type MetaTalentTree,
} from '~/utils/metaTypes'

export type CountEntry = { count: number, label: string, extra: Record<string, string | number | boolean> }
export type CountMap = Map<string, CountEntry>

export type HeroTalentBucket = {
  label: string
  profiles: number
  talents: Record<MetaTalentTree, CountMap>
}

export type BuildSample = {
  heroId: number | null
  heroLabel: string
  code: string
  treeHash: string | null
  talentIds: number[]
}

export type ProfileBucket = {
  profiles: number
  talents: Record<MetaTalentTree, CountMap>
  loadouts: CountMap
  heroes: CountMap
  gear: CountMap
  stats: Map<string, { label: string, total: number }>
  enchants: CountMap
  gems: CountMap
  races: CountMap
  gearMods: Map<string, { enchants: CountMap, gems: CountMap }>
  talentsByHero: Map<number, HeroTalentBucket>
  ilvlSamples: Map<string, number[]>
  builds: BuildSample[]
  unknownTalentNodes: number
}

export type MetaKeyLevelStats = {
  min: number
  max: number
  sum: number
  count: number
}

export type SpecPop = {
  className: string
  specName: string
  count: number
  /** @deprecated Prefer keyLevelStats; may be empty when stats are present. */
  keyLevels: number[]
  keyLevelStats?: MetaKeyLevelStats
}

export function emptyKeyLevelStats(): MetaKeyLevelStats {
  return { min: 0, max: 0, sum: 0, count: 0 }
}

export function observeKeyLevel(stats: MetaKeyLevelStats, level: number): void {
  if (!(level > 0) || !Number.isFinite(level)) return
  if (stats.count === 0) {
    stats.min = level
    stats.max = level
    stats.sum = level
    stats.count = 1
    return
  }
  if (level < stats.min) stats.min = level
  if (level > stats.max) stats.max = level
  stats.sum += level
  stats.count += 1
}

export function metaKeyLevelsFromStats(stats: MetaKeyLevelStats | null | undefined): MetaKeyLevels | null {
  if (!stats || stats.count <= 0) return null
  return { min: stats.min, max: stats.max, average: Math.round((stats.sum / stats.count) * 10) / 10 }
}

export function emptyProfileBucket(): ProfileBucket {
  return {
    profiles: 0,
    talents: { class: new Map(), spec: new Map(), hero: new Map() },
    loadouts: new Map(),
    heroes: new Map(),
    gear: new Map(),
    stats: new Map(),
    enchants: new Map(),
    gems: new Map(),
    races: new Map(),
    gearMods: new Map(),
    talentsByHero: new Map(),
    ilvlSamples: new Map(),
    builds: [],
    unknownTalentNodes: 0,
  }
}

export function increment(map: CountMap, key: string, label: string, extra: Record<string, string | number | boolean> = {}) {
  const current = map.get(key)
  if (current) current.count += 1
  else map.set(key, { count: 1, label, extra })
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asBool(value: unknown): boolean {
  return value === true || value === 'true'
}

export function shareOf(count: number, total: number): number {
  const denom = total > 0 ? total : 1
  const share = Math.round((count / denom) * 1000) / 1000
  if (!Number.isFinite(share) || share < 0) return 0
  return Math.min(1, share)
}

export function keyLevelsOf(levels: number[]): MetaKeyLevels | null {
  const stats = emptyKeyLevelStats()
  for (const level of levels) observeKeyLevel(stats, level)
  return metaKeyLevelsFromStats(stats)
}

export function keyLevelsOfPop(pop: Pick<SpecPop, 'keyLevels' | 'keyLevelStats'>): MetaKeyLevels | null {
  return metaKeyLevelsFromStats(pop.keyLevelStats) ?? keyLevelsOf(pop.keyLevels)
}

export function medianNumber(values: number[]): number | null {
  const usable = values.filter(value => Number.isFinite(value))
  if (!usable.length) return null
  const sorted = [...usable].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2) return Math.round(sorted[mid]!)
  return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
}

export function iconFilenameFromUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const base = trimmed.split('?')[0]?.split('/').pop() || ''
  const filename = base.replace(/\.(jpg|jpeg|png|webp)$/i, '')
  return filename || null
}

export type ExtractedTalent = { id: number, label: string, node: number | null, spellId: number | null }

function collectTalentsFromList(list: unknown, into: ExtractedTalent[]) {
  for (const node of asArray(list)) {
    const rec = asRecord(node)
    if (!rec) continue
    const tooltip = asRecord(rec.tooltip)
    const talent = asRecord(rec.talent) || asRecord(tooltip?.talent)
    const nodeId = asNumber(rec.id)
    const talentId = asNumber(talent?.id)
    const id = talentId ?? nodeId
    const spellId = asNumber(asRecord(asRecord(tooltip?.spell_tooltip)?.spell)?.id) ?? asNumber(asRecord(asRecord(rec.spell_tooltip)?.spell)?.id)
    const label = asString(talent?.name) || asString(rec.name) || (id != null ? `Talent ${id}` : '')
    if (id != null) into.push({ id, label, node: nodeId, spellId })
  }
}

function loadoutCodeOf(rec: Record<string, unknown>): string {
  return asString(rec.talent_loadout_code) || asString(rec.loadout_code) || asString(rec.code)
}

function loadoutTreeHashOf(rec: Record<string, unknown>): string | null {
  const raw = asString(rec.talent_tree_hash) || asString(rec.tree_hash) || asString(rec.build_hash)
  return raw || null
}

function heroTreeOf(rec: Record<string, unknown>): { id: number, label: string } | null {
  const hero = asRecord(rec.hero_talent_tree)
    || asRecord(rec.hero_talents)
    || asRecord(rec.selected_hero_talent_tree)
    || asRecord(rec.hero_tree)
  const id = asNumber(hero?.id) ?? asNumber(rec.hero_talent_tree_id)
  const label = asString(hero?.name) || (id != null ? `Hero ${id}` : '')
  return id != null ? { id, label: label || `Hero ${id}` } : null
}

export function extractActiveLoadouts(specsBody: unknown): Array<{
  code: string
  treeHash: string | null
  header: { version: number, specId: number, treeHash: string } | null
  hero: { id: number, label: string } | null
  classTalents: ExtractedTalent[]
  specTalents: ExtractedTalent[]
  heroTalents: ExtractedTalent[]
}> {
  const root = asRecord(specsBody)
  if (!root) return []
  const loadouts: Array<Record<string, unknown>> = []
  for (const spec of asArray(root.specializations)) {
    const rec = asRecord(spec)
    for (const raw of asArray(rec?.loadouts)) {
      const loadout = asRecord(raw)
      if (loadout) loadouts.push(loadout)
    }
    const nested = asRecord(rec?.talent_loadout)
    if (nested) loadouts.push(nested)
  }
  const rootLoadout = asRecord(root.talent_loadout) || asRecord(root.loadout)
  if (rootLoadout) loadouts.push(rootLoadout)

  const active = loadouts.filter(item => item.is_active === true)
  const chosen = active.length ? active : loadouts
  return chosen.map((loadout) => {
    const classTalents: ExtractedTalent[] = []
    const specTalents: ExtractedTalent[] = []
    const heroTalents: ExtractedTalent[] = []
    collectTalentsFromList(loadout.selected_class_talents, classTalents)
    collectTalentsFromList(loadout.selected_spec_talents, specTalents)
    collectTalentsFromList(loadout.selected_hero_talents, heroTalents)
    const code = loadoutCodeOf(loadout)
    const header = decodeLoadoutHeader(code)
    const hero = heroTreeOf(loadout) || heroTreeOf(root)
    return {
      code,
      treeHash: loadoutTreeHashOf(loadout) || header?.treeHash || null,
      header,
      hero,
      classTalents,
      specTalents,
      heroTalents,
    }
  })
}

export function playableClassName(specsBody: unknown, fallback: string): string {
  const character = asRecord(asRecord(specsBody)?.character)
  const playable = asRecord(character?.playable_class)
  return asString(playable?.name) || fallback
}

export function raceFromCharacter(characterBody: unknown): { id: number, label: string } | null {
  const rec = asRecord(characterBody)
  const race = asRecord(rec?.race) || asRecord(rec?.playable_race)
  const id = asNumber(race?.id)
  const label = asString(race?.name)
  if (id == null || !label) return null
  return { id, label }
}

const SECONDARY_STATS: Record<string, string> = {
  CRIT_RATING: 'Critical Strike',
  CRIT: 'Critical Strike',
  CRITICAL_STRIKE: 'Critical Strike',
  HASTE_RATING: 'Haste',
  HASTE: 'Haste',
  MASTERY_RATING: 'Mastery',
  MASTERY: 'Mastery',
  VERSATILITY: 'Versatility',
}

export function collectItemStats(item: unknown): Array<{ id: string, label: string, value: number }> {
  const rec = asRecord(item)
  const preview = asRecord(rec?.preview_item)
  const stats = [...asArray(rec?.stats), ...asArray(preview?.stats)]
  const out: Array<{ id: string, label: string, value: number }> = []
  for (const raw of stats) {
    const row = asRecord(raw)
    const typeRec = asRecord(row?.type)
    const type = (asString(typeRec?.type) || asString(typeRec?.name) || asString(row?.type)).toUpperCase().replace(/\s+/g, '_')
    const id = SECONDARY_STATS[type] ? type.replace('_RATING', '').replace('CRITICAL_STRIKE', 'CRIT') : ''
    const label = SECONDARY_STATS[type]
    const value = asNumber(row?.value)
    if (!label || value == null) continue
    const normalized = id === 'CRIT' || type.includes('CRIT') ? 'crit' : type.includes('HASTE') ? 'haste' : type.includes('MASTERY') ? 'mastery' : 'versatility'
    out.push({ id: normalized, label, value })
  }
  return out
}

function itemQuality(item: Record<string, unknown>): string | null {
  const quality = asRecord(item.quality) || asRecord(asRecord(item.preview_item)?.quality)
  return asString(quality?.type) || asString(quality?.name) || null
}

function itemSetName(item: Record<string, unknown>): string | null {
  const set = asRecord(item.set) || asRecord(asRecord(item.preview_item)?.set)
  const named = asRecord(set?.item_set) || set
  return asString(named?.name) || null
}

function itemCrafted(item: Record<string, unknown>): boolean {
  const preview = asRecord(item.preview_item)
  if (asBool(item.crafted) || asBool(preview?.crafted) || asBool(item.is_crafted) || asBool(preview?.is_crafted)) return true
  const context = asString(item.context) || asString(preview?.context)
  return /craft/i.test(context)
}

function itemEmbellished(item: Record<string, unknown>): boolean {
  const preview = asRecord(item.preview_item)
  if (asBool(item.embellished) || asBool(preview?.embellished) || asBool(item.is_embellished)) return true
  const limit = asString(item.limit_category) || asString(preview?.limit_category)
  const description = asString(item.description) || asString(preview?.description)
  return /embellish/i.test(limit) || /embellish/i.test(description)
}

function itemIlvl(item: Record<string, unknown>): number | null {
  const preview = asRecord(item.preview_item)
  const level = asRecord(item.level) || asRecord(preview?.level)
  return asNumber(level?.value) ?? asNumber(item.level) ?? asNumber(preview?.level)
}

const SOURCE_BY_CONTEXT: Record<string, string> = {
  DUNGEON: 'Dungeon',
  DUNGEON_NORMAL: 'Dungeon',
  DUNGEON_HEROIC: 'Dungeon',
  DUNGEON_MYTHIC: 'Dungeon',
  MYTHIC_DUNGEON: 'Dungeon',
  MYTHIC_PLUS: 'Dungeon',
  CHALLENGE_MODE: 'Dungeon',
  RAID: 'Raid',
  RAID_LFR: 'Raid',
  RAID_NORMAL: 'Raid',
  RAID_HEROIC: 'Raid',
  RAID_MYTHIC: 'Raid',
  CRAFTED: 'Crafted',
  TRADE_SKILL: 'Crafted',
  PROFESSION: 'Crafted',
  PVP: 'PvP',
  PVP_RANKED: 'PvP',
  PVP_UNRANKED: 'PvP',
  VENDOR: 'Vendor',
  QUEST: 'Quest',
  WORLD_QUEST: 'Quest',
  PROMOTIONAL: 'Promotion',
  WORLD_DROP: 'World drop',
  WORLDDROP: 'World drop',
}

export function itemSourceOf(item: Record<string, unknown>, crafted: boolean): string | null {
  if (crafted) return 'Crafted'
  const preview = asRecord(item.preview_item)
  const context = (asString(item.context) || asString(preview?.context) || asString(asRecord(item.context)?.type)).toUpperCase().replace(/\s+/g, '_')
  if (SOURCE_BY_CONTEXT[context]) return SOURCE_BY_CONTEXT[context]
  if (/DUNGEON|MYTHIC.?PLUS|KEYSTONE/i.test(context)) return 'Dungeon'
  if (/RAID/i.test(context)) return 'Raid'
  if (/PVP|ARENA|BATTLEGROUND/i.test(context)) return 'PvP'
  if (/QUEST/i.test(context)) return 'Quest'
  if (/CRAFT|TRADE/i.test(context)) return 'Crafted'
  return null
}

export function extractItemIcon(item: Record<string, unknown>): string | null {
  const preview = asRecord(item.preview_item)
  for (const raw of [...asArray(item.assets), ...asArray(asRecord(item.media)?.assets), ...asArray(preview ? asRecord(preview.media)?.assets : [])]) {
    const rec = asRecord(raw)
    const key = asString(rec?.key)
    const value = asString(rec?.value) || asString(rec?.href)
    if ((key === 'icon' || !key) && value) {
      const filename = iconFilenameFromUrl(value)
      if (filename) return filename
    }
  }
  return iconFilenameFromUrl(asString(item.icon) || asString(preview?.icon))
}

export function extractMediaIcon(body: unknown): string | null {
  const rec = asRecord(body)
  for (const raw of asArray(rec?.assets)) {
    const asset = asRecord(raw)
    if (asString(asset?.key) === 'icon') {
      const filename = iconFilenameFromUrl(asString(asset?.value))
      if (filename) return filename
    }
  }
  return null
}

export function collectEquippedItems(equipmentBody: unknown): Array<{
  slot: string
  itemId: number
  label: string
  quality: string | null
  setName: string | null
  crafted: boolean
  embellished: boolean
  ilvl: number | null
  source: string | null
  icon: string | null
  stats: Array<{ id: string, label: string, value: number }>
  enchants: Array<{ id: number, label: string }>
  gems: Array<{ id: number, label: string }>
}> {
  const root = asRecord(equipmentBody)
  const out = []
  for (const raw of asArray(root?.equipped_items)) {
    const rec = asRecord(raw)
    if (!rec) continue
    const slot = (asString(asRecord(rec.slot)?.type) || asString(asRecord(rec.slot)?.name)).toUpperCase()
    if (!slot || /SHIRT|TABARD/i.test(slot)) continue
    const itemId = asNumber(asRecord(rec.item)?.id)
    const label = asString(rec.name) || (itemId != null ? `Item ${itemId}` : '')
    if (itemId == null) continue
    const preview = asRecord(rec.preview_item)
    const enchants: Array<{ id: number, label: string }> = []
    for (const row of [...asArray(rec.enchantments), ...asArray(preview?.enchantments)]) {
      const entry = asRecord(row)
      const id = asNumber(entry?.enchantment_id) ?? asNumber(entry?.id) ?? asNumber(asRecord(entry?.enchantment)?.id)
      const enchantLabel = asString(entry?.display_string) || asString(asRecord(entry?.enchantment)?.name) || (id != null ? `Enchant ${id}` : '')
      if (id != null) enchants.push({ id, label: enchantLabel })
    }
    const gems: Array<{ id: number, label: string }> = []
    for (const row of [...asArray(rec.sockets), ...asArray(preview?.sockets)]) {
      const entry = asRecord(row)
      const socketItem = asRecord(entry?.item)
      const id = asNumber(socketItem?.id) ?? asNumber(entry?.item_id)
      const gemLabel = asString(socketItem?.name) || asString(entry?.display_string) || (id != null ? `Gem ${id}` : '')
      if (id != null) gems.push({ id, label: gemLabel })
    }
    const crafted = itemCrafted(rec)
    out.push({
      slot,
      itemId,
      label,
      quality: itemQuality(rec),
      setName: itemSetName(rec),
      crafted,
      embellished: itemEmbellished(rec),
      ilvl: itemIlvl(rec),
      source: itemSourceOf(rec, crafted),
      icon: extractItemIcon(rec),
      stats: collectItemStats(rec),
      enchants,
      gems,
    })
  }
  return out
}

export type TalentTreeFilter = {
  hash: string | null
  build: string | null
  nodeIds: Set<number>
}

export function loadoutMatchesCurrentTree(
  loadout: { treeHash: string | null },
  tree: TalentTreeFilter | null,
): boolean {
  if (!tree?.hash) return true
  if (loadout.treeHash && loadout.treeHash !== tree.hash) return false
  return true
}


export function isTalentMapped(
  talent: { id: number, node: number | null },
  knownNodes?: Set<number>,
  knownTalentIds?: Set<number>,
): boolean {
  if (!knownNodes && !knownTalentIds) return true
  if (talent.node != null && knownNodes?.has(talent.node)) return true
  if (knownNodes?.has(talent.id)) return true
  if (knownTalentIds?.has(talent.id)) return true
  return false
}

export function absorbProfile(
  bucket: ProfileBucket,
  input: {
    specsBody: unknown
    equipmentBody: unknown
    characterBody?: unknown
    tree?: TalentTreeFilter | null
    iconByItemId?: Map<number, string>
    knownNodes?: Set<number>
    knownTalentIds?: Set<number>
  },
) {
  bucket.profiles += 1
  const loadouts = extractActiveLoadouts(input.specsBody)
  const seenTalent = new Set<string>()
  const seenHeroes = new Set<number>()
  let countedHero: { id: number, label: string } | null = null
  let recordedBuild = false
  for (const loadout of loadouts) {
    if (!loadoutMatchesCurrentTree(loadout, input.tree ?? null)) continue
    const treeHash = loadout.treeHash || input.tree?.hash || null
    if (loadout.code) {
      increment(bucket.loadouts, loadout.code, loadout.code, {
        ...(loadout.hero ? { heroId: loadout.hero.id, heroLabel: loadout.hero.label } : {}),
        ...(treeHash ? { treeHash } : {}),
      })
    }
    if (loadout.hero) {
      // Players can have more than one active loadout on the same hero tree;
      // count each tree once per profile so heroSplit.share stays ≤ 1.
      if (!seenHeroes.has(loadout.hero.id)) {
        seenHeroes.add(loadout.hero.id)
        increment(bucket.heroes, String(loadout.hero.id), loadout.hero.label, { id: loadout.hero.id })
      }
      if (!countedHero) countedHero = loadout.hero
    }
    const talentIds: number[] = []
    for (const [tree, list] of [['class', loadout.classTalents], ['spec', loadout.specTalents], ['hero', loadout.heroTalents]] as const) {
      for (const talent of list) {
        talentIds.push(talent.id)
        const key = `${tree}:${talent.id}`
        if (seenTalent.has(key)) continue
        seenTalent.add(key)
        const mapped = isTalentMapped(talent, input.knownNodes, input.knownTalentIds)
        if (!mapped) bucket.unknownTalentNodes += 1
        increment(bucket.talents[tree], String(talent.id), talent.label, {
          id: talent.id,
          node: talent.node ?? '',
          spellId: talent.spellId ?? '',
          unmapped: !mapped,
        })
      }
    }
    if (!recordedBuild && loadout.code) {
      bucket.builds.push({
        heroId: loadout.hero?.id ?? null,
        heroLabel: loadout.hero?.label ?? '',
        code: loadout.code,
        treeHash,
        talentIds: [...new Set(talentIds)],
      })
      recordedBuild = true
    }
  }
  if (countedHero) {
    let heroBucket = bucket.talentsByHero.get(countedHero.id)
    if (!heroBucket) {
      heroBucket = { label: countedHero.label, profiles: 0, talents: { class: new Map(), spec: new Map(), hero: new Map() } }
      bucket.talentsByHero.set(countedHero.id, heroBucket)
    }
    heroBucket.profiles += 1
    const seenHeroTalent = new Set<string>()
    for (const loadout of loadouts) {
      if (!loadout.hero || loadout.hero.id !== countedHero.id) continue
      if (!loadoutMatchesCurrentTree(loadout, input.tree ?? null)) continue
      for (const [tree, list] of [['class', loadout.classTalents], ['spec', loadout.specTalents], ['hero', loadout.heroTalents]] as const) {
        for (const talent of list) {
          const key = `${tree}:${talent.id}`
          if (seenHeroTalent.has(key)) continue
          seenHeroTalent.add(key)
          increment(heroBucket.talents[tree], String(talent.id), talent.label, { id: talent.id })
        }
      }
    }
  }
  const race = raceFromCharacter(input.characterBody)
  if (race) increment(bucket.races, String(race.id), race.label, { id: race.id })

  const seenGear = new Set<string>()
  const seenEnchant = new Set<number>()
  const seenGem = new Set<number>()
  const statTotals = new Map<string, { label: string, value: number }>()
  for (const item of collectEquippedItems(input.equipmentBody)) {
    const icon = item.icon || input.iconByItemId?.get(item.itemId) || ''
    const key = `${item.slot}:${item.itemId}`
    if (!seenGear.has(key)) {
      seenGear.add(key)
      increment(bucket.gear, key, item.label, {
        itemId: item.itemId,
        slot: item.slot,
        quality: item.quality || '',
        setName: item.setName || '',
        crafted: item.crafted,
        embellished: item.embellished,
        source: item.source || '',
        icon,
      })
      if (item.ilvl != null) {
        const samples = bucket.ilvlSamples.get(key) ?? []
        samples.push(item.ilvl)
        bucket.ilvlSamples.set(key, samples)
      }
      let mods = bucket.gearMods.get(key)
      if (!mods) {
        mods = { enchants: new Map(), gems: new Map() }
        bucket.gearMods.set(key, mods)
      }
      for (const enchant of item.enchants) increment(mods.enchants, String(enchant.id), enchant.label, { id: enchant.id })
      for (const gem of item.gems) increment(mods.gems, String(gem.id), gem.label, { id: gem.id })
    }
    for (const stat of item.stats) {
      const current = statTotals.get(stat.id)
      if (current) current.value += stat.value
      else statTotals.set(stat.id, { label: stat.label, value: stat.value })
    }
    for (const enchant of item.enchants) {
      if (seenEnchant.has(enchant.id)) continue
      seenEnchant.add(enchant.id)
      increment(bucket.enchants, String(enchant.id), enchant.label, { id: enchant.id })
    }
    for (const gem of item.gems) {
      if (seenGem.has(gem.id)) continue
      seenGem.add(gem.id)
      increment(bucket.gems, String(gem.id), gem.label, { id: gem.id })
    }
  }
  for (const [id, stat] of statTotals) {
    const current = bucket.stats.get(id)
    if (current) current.total += stat.value
    else bucket.stats.set(id, { label: stat.label, total: stat.value })
  }
}

function topTalentList(map: CountMap, total: number, tree: MetaTalentTree): MetaTalentCount[] {
  const denom = total > 0 ? total : 1
  return [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
    .slice(0, META_TOP_ITEMS)
    .map(([, entry]) => {
      const share = shareOf(entry.count, denom)
      return {
        id: Number(entry.extra.id),
        label: entry.label,
        count: entry.count,
        share,
        tree,
        band: talentBand(share),
        node: entry.extra.node == null || entry.extra.node === '' ? null : Number(entry.extra.node),
        spellId: entry.extra.spellId == null || entry.extra.spellId === '' ? null : Number(entry.extra.spellId),
        icon: entry.extra.icon ? String(entry.extra.icon) : null,
        unmapped: entry.extra.unmapped === true,
      }
    })
}

function talentsOf(bucketTalents: Record<MetaTalentTree, CountMap>, total: number): MetaTalentGroups {
  return {
    class: topTalentList(bucketTalents.class, total, 'class'),
    spec: topTalentList(bucketTalents.spec, total, 'spec'),
    hero: topTalentList(bucketTalents.hero, total, 'hero'),
  }
}

function topNamed<T>(map: CountMap, total: number, limit: number, toRow: (entry: CountEntry, share: number) => T): T[] {
  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map(entry => toRow(entry, shareOf(entry.count, total)))
}

const TRINKET_SLOTS = new Set(['TRINKET_1', 'TRINKET_2', 'TRINKET'])
const RING_SLOTS = new Set(['FINGER_1', 'FINGER_2', 'FINGER', 'RING'])
const SLOT_ORDER = [
  'HEAD', 'NECK', 'SHOULDER', 'BACK', 'CHEST', 'WRIST', 'HANDS', 'WAIST', 'LEGS', 'FEET',
  'FINGER_1', 'FINGER_2', 'TRINKET_1', 'TRINKET_2', 'MAIN_HAND', 'OFF_HAND', 'RANGED',
]

function gearModsFor(bucket: ProfileBucket | undefined, entry: CountEntry): { enchants: CountMap, gems: CountMap } | undefined {
  const key = `${entry.extra.slot}:${entry.extra.itemId}`
  return bucket?.gearMods.get(key)
}

function toGear(entry: CountEntry, share: number, bucket?: ProfileBucket, icons?: Map<number, string>): MetaGearCount {
  const mods = gearModsFor(bucket, entry)
  const topEnchant = mods ? [...mods.enchants.values()].sort((a, b) => b.count - a.count)[0] : undefined
  const gems = mods
    ? [...mods.gems.values()].sort((a, b) => b.count - a.count).slice(0, 3).map(gem => ({ id: Number(gem.extra.id), label: gem.label }))
    : []
  const gearKey = `${entry.extra.slot}:${entry.extra.itemId}`
  const ilvl = medianNumber(bucket?.ilvlSamples.get(gearKey) ?? [])
  const icon = (entry.extra.icon ? String(entry.extra.icon) : '') || icons?.get(Number(entry.extra.itemId)) || null
  return {
    slot: String(entry.extra.slot || ''),
    itemId: Number(entry.extra.itemId),
    label: entry.label,
    count: entry.count,
    // Combined ring/trinket/embellishment slots can total more than one item
    // per player; the snapshot schema requires share in [0, 1].
    share: Math.min(1, share),
    quality: entry.extra.quality ? String(entry.extra.quality) : null,
    setName: entry.extra.setName ? String(entry.extra.setName) : null,
    crafted: entry.extra.crafted === true,
    embellished: entry.extra.embellished === true,
    ilvl,
    source: entry.extra.source ? String(entry.extra.source) : null,
    icon: icon || null,
    lowSample: itemIsLowSample(entry.count),
    enchant: topEnchant ? { id: Number(topEnchant.extra.id), label: topEnchant.label } : null,
    gems,
  }
}

function mergeSlotItems(map: CountMap, slots: Set<string>, total: number, bucket?: ProfileBucket, icons?: Map<number, string>): MetaGearCount[] {
  const merged = new Map<number, CountEntry>()
  for (const entry of map.values()) {
    if (!slots.has(String(entry.extra.slot))) continue
    const itemId = Number(entry.extra.itemId)
    const current = merged.get(itemId)
    if (current) current.count += entry.count
    else merged.set(itemId, { count: entry.count, label: entry.label, extra: { ...entry.extra, slot: 'COMBINED' } })
  }
  return [...merged.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, META_TOP_SLOT_ITEMS)
    .map(entry => toGear(entry, shareOf(entry.count, total), bucket, icons))
}

function gearSlots(map: CountMap, total: number, bucket?: ProfileBucket, icons?: Map<number, string>): MetaSpecSummary['gearSlots'] {
  const bySlot = new Map<string, CountEntry[]>()
  for (const entry of map.values()) {
    const slot = String(entry.extra.slot || '')
    if (!slot || TRINKET_SLOTS.has(slot) || RING_SLOTS.has(slot)) continue
    const list = bySlot.get(slot) ?? []
    list.push(entry)
    bySlot.set(slot, list)
  }
  const slots = [...bySlot.keys()].sort((a, b) => {
    const ai = SLOT_ORDER.indexOf(a)
    const bi = SLOT_ORDER.indexOf(b)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b)
  })
  return slots.map((slot) => {
    const items = (bySlot.get(slot) ?? [])
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, META_TOP_SLOT_ITEMS)
      .map(entry => toGear(entry, shareOf(entry.count, total), bucket, icons))
    return { slot, items }
  })
}

function emptySpec(_classSlug: string, specLabel: string, specSlug: string): MetaSpecSummary {
  return applySpecFlags({
    slug: specSlug,
    label: specLabel,
    n: 0,
    share: 0,
    profileCount: 0,
    keyLevels: null,
    heroSplit: [],
    loadouts: [],
    talents: { class: [], spec: [], hero: [] },
    talentsByHero: [],
    talentLayout: null,
    stats: [],
    gearSlots: [],
    trinkets: [],
    rings: [],
    embellishments: [],
    enchants: [],
    gems: [],
    races: [],
  })
}

function talentsByHeroOf(bucket: ProfileBucket): MetaHeroTalentGroup[] {
  return [...bucket.talentsByHero.entries()]
    .sort((a, b) => b[1].profiles - a[1].profiles || a[1].label.localeCompare(b[1].label))
    .map(([id, hero]) => ({
      heroTree: { id, label: hero.label },
      n: hero.profiles,
      talents: talentsOf(hero.talents, hero.profiles),
    }))
}


export function majorityBestBuild(builds: BuildSample[], coreShare = 0.8): MetaLoadout | null {
  if (!builds.length) return null
  const total = builds.length
  const talentCount = new Map<number, number>()
  for (const build of builds) {
    for (const id of new Set(build.talentIds)) talentCount.set(id, (talentCount.get(id) ?? 0) + 1)
  }
  const coreIds = new Set([...talentCount.entries()].filter(([, count]) => count / total >= coreShare).map(([id]) => id))
  const groups = new Map<string, BuildSample[]>()
  for (const build of builds) {
    const corePicked = build.talentIds.filter(id => coreIds.has(id)).sort((a, b) => a - b)
    const key = `${build.heroId ?? 'none'}|${corePicked.join(',')}`
    const list = groups.get(key) ?? []
    list.push(build)
    groups.set(key, list)
  }
  const winner = [...groups.values()].sort((a, b) => b.length - a.length || (b[0]?.code || '').localeCompare(a[0]?.code || ''))[0]
  if (!winner?.length) return null
  const codeCount = new Map<string, number>()
  for (const build of winner) codeCount.set(build.code, (codeCount.get(build.code) ?? 0) + 1)
  const topCode = [...codeCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0]
  const sample = winner.find(build => build.code === topCode) ?? winner[0]!
  return {
    code: topCode,
    count: winner.length,
    share: shareOf(winner.length, total),
    heroTree: sample.heroId != null ? { id: sample.heroId, label: sample.heroLabel } : null,
    treeHash: sample.treeHash,
  }
}

export function buildClassSummaries(
  specPop: Map<string, SpecPop>,
  profileBySpec: Map<string, ProfileBucket>,
  totalCharacters: number,
  icons?: Map<number, string>,
): MetaClassSummary[] {
  const byClass = new Map<string, MetaClassSummary>()
  for (const cls of META_CLASSES) {
    byClass.set(cls.slug, { slug: cls.slug, label: cls.name, n: 0, specs: [] })
  }

  for (const [specKey, pop] of specPop) {
    const classSlug = toMetaSlug(pop.className)
    const specSlug = toMetaSlug(pop.specName)
    if (!findMetaClass(classSlug) || !findMetaSpec(classSlug, specSlug)) continue
    let cls = byClass.get(classSlug)
    if (!cls) {
      cls = { slug: classSlug, label: pop.className, n: 0, specs: [] }
      byClass.set(classSlug, cls)
    }
    cls.n += pop.count
    const bucket = profileBySpec.get(specKey) ?? emptyProfileBucket()
    const profiles = bucket.profiles
    const loadouts = topNamed(bucket.loadouts, profiles, 6, (entry, share) => ({
      code: entry.label,
      count: entry.count,
      share,
      heroTree: typeof entry.extra.heroId === 'number'
        ? { id: Number(entry.extra.heroId), label: String(entry.extra.heroLabel || '') }
        : null,
      treeHash: entry.extra.treeHash ? String(entry.extra.treeHash) : null,
    })) as MetaLoadout[]
    const heroSplit = topNamed(bucket.heroes, profiles, 6, (entry, share) => ({
      id: Number(entry.extra.id),
      label: entry.label,
      count: entry.count,
      share,
    })) as MetaHeroSplit[]
    const stats: MetaStatBar[] = [...bucket.stats.entries()]
      .map(([id, stat]) => ({ id, label: stat.label, average: profiles ? Math.round(stat.total / profiles) : 0 }))
      .sort((a, b) => b.average - a.average || a.label.localeCompare(b.label))
    const enchants = topNamed(bucket.enchants, profiles, META_TOP_SLOT_ITEMS, (entry, share) => ({
      id: Number(entry.extra.id),
      label: entry.label,
      count: entry.count,
      share,
    })) as MetaEnchantGem[]
    const gems = topNamed(bucket.gems, profiles, META_TOP_SLOT_ITEMS, (entry, share) => ({
      id: Number(entry.extra.id),
      label: entry.label,
      count: entry.count,
      share,
    })) as MetaEnchantGem[]
    const races = topNamed(bucket.races, profiles, META_TOP_ITEMS, (entry, share) => ({
      id: Number(entry.extra.id),
      label: entry.label,
      count: entry.count,
      share,
    })) as MetaRaceCount[]
    const embellished = [...bucket.gear.values()]
      .filter(entry => entry.extra.embellished === true)
    const embellishments = mergeSlotItems(
      new Map(embellished.map(entry => [`${entry.extra.slot}:${entry.extra.itemId}`, entry])),
      new Set(embellished.map(entry => String(entry.extra.slot))),
      profiles,
      bucket,
      icons,
    )

    cls.specs.push(applySpecFlags({
      slug: specSlug,
      label: pop.specName,
      n: pop.count,
      share: shareOf(pop.count, totalCharacters),
      profileCount: profiles,
      keyLevels: keyLevelsOfPop(pop),
      heroSplit,
      loadouts,
      bestBuild: majorityBestBuild(bucket.builds),
      talents: talentsOf(bucket.talents, profiles),
      talentsByHero: talentsByHeroOf(bucket),
      talentLayout: null,
      stats,
      gearSlots: gearSlots(bucket.gear, profiles, bucket, icons),
      trinkets: mergeSlotItems(bucket.gear, TRINKET_SLOTS, profiles, bucket, icons),
      rings: mergeSlotItems(bucket.gear, RING_SLOTS, profiles, bucket, icons),
      embellishments,
      enchants,
      gems,
      races,
    }))
  }

  for (const cls of META_CLASSES) {
    const summary = byClass.get(cls.slug)
    if (!summary) continue
    const present = new Set(summary.specs.map(spec => spec.slug))
    for (const spec of cls.specs) {
      if (!present.has(spec.slug)) summary.specs.push(emptySpec(cls.slug, spec.name, spec.slug))
    }
    summary.specs.sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
  }
  return [...byClass.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
}

export function parseTalentLayoutNode(raw: unknown): MetaTalentLayoutNode | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const node = asNumber(rec.id) ?? asNumber(rec.node)
  if (node == null) return null
  const ranks = asArray(rec.ranks)
  const first = asRecord(ranks[0])
  const choiceTooltips = asArray(first?.choice_of_tooltips)
  const single = first?.tooltip != null ? [first.tooltip] : []
  const choices = (choiceTooltips.length ? choiceTooltips : single).map((item) => {
    const tip = asRecord(item)
    const talent = asRecord(tip?.talent)
    const talentId = asNumber(talent?.id)
    if (talentId == null) return null
    const spellId = asNumber(asRecord(asRecord(tip?.spell_tooltip)?.spell)?.id)
    return { talentId, label: asString(talent?.name) || `Talent ${talentId}`, spellId }
  }).filter((item): item is { talentId: number, label: string, spellId: number | null } => item != null)
  const unlocks = asArray(rec.unlocks).map(asNumber).filter((id): id is number => id != null)
  return {
    node,
    row: asNumber(rec.display_row) ?? asNumber(rec.row),
    col: asNumber(rec.display_col) ?? asNumber(rec.col),
    type: asString(asRecord(rec.node_type)?.type) || asString(rec.type) || null,
    maxRank: ranks.length || 1,
    unlocks,
    choices,
  }
}

export function parseTalentTreeLayout(body: unknown, specId: number): MetaTalentLayout | null {
  const rec = asRecord(body)
  if (!rec) return null
  const classNodes = asArray(rec.class_talent_nodes).map(parseTalentLayoutNode).filter((n): n is MetaTalentLayoutNode => n != null)
  const heroTreesRaw = asArray(rec.hero_talent_trees)
  const heroNodeIds = new Set<number>()
  const hero: MetaTalentLayout['hero'] = []
  for (const raw of heroTreesRaw) {
    const tree = asRecord(raw)
    if (!tree) continue
    const specs = asArray(tree.playable_specializations)
    const applies = !specs.length || specs.some(item => asNumber(asRecord(item)?.id) === specId)
    if (!applies) continue
    const nodes = asArray(tree.hero_talent_nodes).map(parseTalentLayoutNode).filter((n): n is MetaTalentLayoutNode => n != null)
    for (const node of nodes) heroNodeIds.add(node.node)
    const id = asNumber(tree.id)
    if (id == null) continue
    hero.push({ id, label: asString(tree.name) || `Hero ${id}`, nodes })
  }
  const specNodes = asArray(rec.spec_talent_nodes)
    .map(parseTalentLayoutNode)
    .filter((n): n is MetaTalentLayoutNode => n != null && !heroNodeIds.has(n.node))
  return { class: classNodes, spec: specNodes, hero }
}

export function knownIdsFromTalentLayout(layout: MetaTalentLayout): { nodes: Set<number>, talentIds: Set<number> } {
  const nodes = new Set<number>()
  const talentIds = new Set<number>()
  const visit = (list: MetaTalentLayoutNode[]) => {
    for (const node of list) {
      nodes.add(node.node)
      for (const choice of node.choices) talentIds.add(choice.talentId)
    }
  }
  visit(layout.class)
  visit(layout.spec)
  for (const tree of layout.hero) visit(tree.nodes)
  return { nodes, talentIds }
}

export function attachSpecLayouts(classes: MetaClassSummary[], layouts: Map<string, MetaTalentLayout>) {
  for (const cls of classes) {
    for (const spec of cls.specs) {
      spec.talentLayout = layouts.get(`${cls.slug}|${spec.slug}`) ?? spec.talentLayout
    }
  }
}

export function applySpellIcons(classes: MetaClassSummary[], icons: Map<number, string>) {
  const patch = (talent: MetaTalentCount) => {
    if (talent.spellId != null && icons.has(talent.spellId)) talent.icon = icons.get(talent.spellId)!
  }
  for (const cls of classes) {
    for (const spec of cls.specs) {
      for (const tree of ['class', 'spec', 'hero'] as const) spec.talents[tree].forEach(patch)
      for (const group of spec.talentsByHero) {
        for (const tree of ['class', 'spec', 'hero'] as const) group.talents[tree].forEach(patch)
      }
    }
  }
}

export function collectSpellIds(classes: MetaClassSummary[]): number[] {
  const ids = new Set<number>()
  const take = (talent: MetaTalentCount) => { if (talent.spellId != null) ids.add(talent.spellId) }
  for (const cls of classes) {
    for (const spec of cls.specs) {
      for (const tree of ['class', 'spec', 'hero'] as const) spec.talents[tree].forEach(take)
      for (const group of spec.talentsByHero) {
        for (const tree of ['class', 'spec', 'hero'] as const) group.talents[tree].forEach(take)
      }
    }
  }
  return [...ids]
}

export function collectItemIds(classes: MetaClassSummary[]): number[] {
  const ids = new Set<number>()
  for (const cls of classes) {
    for (const spec of cls.specs) {
      for (const slot of spec.gearSlots) for (const item of slot.items) ids.add(item.itemId)
      for (const list of [spec.trinkets, spec.rings, spec.embellishments]) {
        for (const item of list) ids.add(item.itemId)
      }
    }
  }
  return [...ids]
}

export function applyItemIcons(classes: MetaClassSummary[], icons: Map<number, string>) {
  const patch = (item: MetaGearCount) => {
    if (!item.icon && icons.has(item.itemId)) item.icon = icons.get(item.itemId)!
  }
  for (const cls of classes) {
    for (const spec of cls.specs) {
      for (const slot of spec.gearSlots) slot.items.forEach(patch)
      spec.trinkets.forEach(patch)
      spec.rings.forEach(patch)
      spec.embellishments.forEach(patch)
    }
  }
}

type SerializedCountMap = Array<[string, CountEntry]>
type SerializedHeroTalent = {
  label: string
  profiles: number
  talents: Record<MetaTalentTree, SerializedCountMap>
}

export type SerializedProfileBucket = {
  profiles: number
  talents: Record<MetaTalentTree, SerializedCountMap>
  loadouts: SerializedCountMap
  heroes: SerializedCountMap
  gear: SerializedCountMap
  stats: Array<[string, { label: string, total: number }]>
  enchants: SerializedCountMap
  gems: SerializedCountMap
  races: SerializedCountMap
  gearMods: Array<[string, { enchants: SerializedCountMap, gems: SerializedCountMap }]>
  talentsByHero: Array<[number, SerializedHeroTalent]>
  ilvlSamples: Array<[string, number[]]>
  builds: BuildSample[]
  unknownTalentNodes: number
}

function serializeCountMap(map: CountMap): SerializedCountMap {
  return [...map.entries()]
}

function deserializeCountMap(rows: SerializedCountMap | undefined): CountMap {
  return new Map(Array.isArray(rows) ? rows : [])
}

function serializeTalents(talents: Record<MetaTalentTree, CountMap>): Record<MetaTalentTree, SerializedCountMap> {
  return {
    class: serializeCountMap(talents.class),
    spec: serializeCountMap(talents.spec),
    hero: serializeCountMap(talents.hero),
  }
}

function deserializeTalents(raw: Record<MetaTalentTree, SerializedCountMap> | undefined): Record<MetaTalentTree, CountMap> {
  return {
    class: deserializeCountMap(raw?.class),
    spec: deserializeCountMap(raw?.spec),
    hero: deserializeCountMap(raw?.hero),
  }
}

/** JSON-safe form of a per-spec aggregate, for SQLite staging. */
export function serializeProfileBucket(bucket: ProfileBucket): SerializedProfileBucket {
  return {
    profiles: bucket.profiles,
    talents: serializeTalents(bucket.talents),
    loadouts: serializeCountMap(bucket.loadouts),
    heroes: serializeCountMap(bucket.heroes),
    gear: serializeCountMap(bucket.gear),
    stats: [...bucket.stats.entries()],
    enchants: serializeCountMap(bucket.enchants),
    gems: serializeCountMap(bucket.gems),
    races: serializeCountMap(bucket.races),
    gearMods: [...bucket.gearMods.entries()].map(([key, mods]) => [key, {
      enchants: serializeCountMap(mods.enchants),
      gems: serializeCountMap(mods.gems),
    }]),
    talentsByHero: [...bucket.talentsByHero.entries()].map(([id, hero]) => [id, {
      label: hero.label,
      profiles: hero.profiles,
      talents: serializeTalents(hero.talents),
    }]),
    ilvlSamples: [...bucket.ilvlSamples.entries()].map(([key, values]) => [key, [...values]]),
    builds: bucket.builds.map(build => ({ ...build, talentIds: [...build.talentIds] })),
    unknownTalentNodes: bucket.unknownTalentNodes,
  }
}

export function deserializeProfileBucket(raw: SerializedProfileBucket | null | undefined): ProfileBucket {
  const bucket = emptyProfileBucket()
  if (!raw || typeof raw !== 'object') return bucket
  bucket.profiles = typeof raw.profiles === 'number' && Number.isFinite(raw.profiles) ? raw.profiles : 0
  bucket.talents = deserializeTalents(raw.talents)
  bucket.loadouts = deserializeCountMap(raw.loadouts)
  bucket.heroes = deserializeCountMap(raw.heroes)
  bucket.gear = deserializeCountMap(raw.gear)
  bucket.stats = new Map(Array.isArray(raw.stats) ? raw.stats : [])
  bucket.enchants = deserializeCountMap(raw.enchants)
  bucket.gems = deserializeCountMap(raw.gems)
  bucket.races = deserializeCountMap(raw.races)
  bucket.gearMods = new Map((raw.gearMods ?? []).map(([key, mods]) => [key, {
    enchants: deserializeCountMap(mods?.enchants),
    gems: deserializeCountMap(mods?.gems),
  }]))
  bucket.talentsByHero = new Map((raw.talentsByHero ?? []).map(([id, hero]) => [Number(id), {
    label: hero.label,
    profiles: hero.profiles,
    talents: deserializeTalents(hero.talents),
  }]))
  bucket.ilvlSamples = new Map((raw.ilvlSamples ?? []).map(([key, values]) => [key, Array.isArray(values) ? [...values] : []]))
  bucket.builds = Array.isArray(raw.builds) ? raw.builds.map(build => ({ ...build, talentIds: [...(build.talentIds ?? [])] })) : []
  bucket.unknownTalentNodes = typeof raw.unknownTalentNodes === 'number' ? raw.unknownTalentNodes : 0
  return bucket
}

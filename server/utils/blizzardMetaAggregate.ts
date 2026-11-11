/**
 * Pure aggregation helpers for a Meta snapshot. No HTTP, no character names
 * in the output. Used by the nightly sync and by fixture unit tests.
 */

import { findMetaClass, toMetaSlug } from '~/utils/metaCatalog'
import {
  META_MIN_SAMPLE,
  META_TOP_ITEMS,
  META_TOP_SLOT_ITEMS,
  talentBand,
  type MetaClassSummary,
  type MetaEnchantGem,
  type MetaGearCount,
  type MetaHeroSplit,
  type MetaKeyLevels,
  type MetaLoadout,
  type MetaRaceCount,
  type MetaSpecSummary,
  type MetaStatBar,
  type MetaTalentCount,
  type MetaTalentTree,
} from '~/utils/metaTypes'

export type CountEntry = { count: number, name: string, extra: Record<string, string | number | boolean> }
export type CountMap = Map<string, CountEntry>

export type ProfileBucket = {
  profiles: number
  talents: Record<MetaTalentTree, CountMap>
  loadouts: CountMap
  heroes: CountMap
  gear: CountMap
  stats: Map<string, { name: string, total: number }>
  enchants: CountMap
  gems: CountMap
  races: CountMap
  gearMods: Map<string, { enchants: CountMap, gems: CountMap }>
}

export type SpecPop = {
  className: string
  specName: string
  count: number
  keyLevels: number[]
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
  }
}

export function increment(map: CountMap, key: string, name: string, extra: Record<string, string | number | boolean> = {}) {
  const current = map.get(key)
  if (current) current.count += 1
  else map.set(key, { count: 1, name, extra })
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
  return Math.round((count / denom) * 1000) / 1000
}

export function keyLevelsOf(levels: number[]): MetaKeyLevels | null {
  const usable = levels.filter(level => Number.isFinite(level) && level > 0)
  if (!usable.length) return null
  const min = Math.min(...usable)
  const max = Math.max(...usable)
  const average = Math.round((usable.reduce((sum, level) => sum + level, 0) / usable.length) * 10) / 10
  return { min, max, average }
}

function collectTalentsFromList(list: unknown, into: Array<{ id: number, name: string }>) {
  for (const node of asArray(list)) {
    const rec = asRecord(node)
    if (!rec) continue
    const talent = asRecord(rec.talent) || asRecord(asRecord(rec.tooltip)?.talent)
    const id = asNumber(talent?.id) ?? asNumber(rec.id)
    const name = asString(talent?.name) || asString(rec.name) || (id != null ? `Talent ${id}` : '')
    if (id != null) into.push({ id, name })
  }
}

function loadoutCodeOf(rec: Record<string, unknown>): string {
  return asString(rec.talent_loadout_code) || asString(rec.loadout_code) || asString(rec.code)
}

function heroTreeOf(rec: Record<string, unknown>): { id: number, name: string } | null {
  const hero = asRecord(rec.hero_talent_tree)
    || asRecord(rec.hero_talents)
    || asRecord(rec.selected_hero_talent_tree)
    || asRecord(rec.hero_tree)
  const id = asNumber(hero?.id) ?? asNumber(rec.hero_talent_tree_id)
  const name = asString(hero?.name) || (id != null ? `Hero ${id}` : '')
  return id != null ? { id, name: name || `Hero ${id}` } : null
}

export function extractActiveLoadouts(specsBody: unknown): Array<{
  code: string
  hero: { id: number, name: string } | null
  classTalents: Array<{ id: number, name: string }>
  specTalents: Array<{ id: number, name: string }>
  heroTalents: Array<{ id: number, name: string }>
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
    const classTalents: Array<{ id: number, name: string }> = []
    const specTalents: Array<{ id: number, name: string }> = []
    const heroTalents: Array<{ id: number, name: string }> = []
    collectTalentsFromList(loadout.selected_class_talents, classTalents)
    collectTalentsFromList(loadout.selected_spec_talents, specTalents)
    collectTalentsFromList(loadout.selected_hero_talents, heroTalents)
    return {
      code: loadoutCodeOf(loadout),
      hero: heroTreeOf(loadout),
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

export function raceFromCharacter(characterBody: unknown): { id: number, name: string } | null {
  const rec = asRecord(characterBody)
  const race = asRecord(rec?.race) || asRecord(rec?.playable_race)
  const id = asNumber(race?.id)
  const name = asString(race?.name)
  if (id == null || !name) return null
  return { id, name }
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

export function collectItemStats(item: unknown): Array<{ id: string, name: string, value: number }> {
  const rec = asRecord(item)
  const preview = asRecord(rec?.preview_item)
  const stats = [...asArray(rec?.stats), ...asArray(preview?.stats)]
  const out: Array<{ id: string, name: string, value: number }> = []
  for (const raw of stats) {
    const row = asRecord(raw)
    const typeRec = asRecord(row?.type)
    const type = (asString(typeRec?.type) || asString(typeRec?.name) || asString(row?.type)).toUpperCase().replace(/\s+/g, '_')
    const id = SECONDARY_STATS[type] ? type.replace('_RATING', '').replace('CRITICAL_STRIKE', 'CRIT') : ''
    const name = SECONDARY_STATS[type]
    const value = asNumber(row?.value)
    if (!name || value == null) continue
    const normalized = id === 'CRIT' || type.includes('CRIT') ? 'crit' : type.includes('HASTE') ? 'haste' : type.includes('MASTERY') ? 'mastery' : 'versatility'
    out.push({ id: normalized, name, value })
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

export function collectEquippedItems(equipmentBody: unknown): Array<{
  slot: string
  itemId: number
  name: string
  quality: string | null
  setName: string | null
  crafted: boolean
  embellished: boolean
  stats: Array<{ id: string, name: string, value: number }>
  enchants: Array<{ id: number, name: string }>
  gems: Array<{ id: number, name: string }>
}> {
  const root = asRecord(equipmentBody)
  const out = []
  for (const raw of asArray(root?.equipped_items)) {
    const rec = asRecord(raw)
    if (!rec) continue
    const slot = (asString(asRecord(rec.slot)?.type) || asString(asRecord(rec.slot)?.name)).toUpperCase()
    if (!slot || /SHIRT|TABARD/i.test(slot)) continue
    const itemId = asNumber(asRecord(rec.item)?.id)
    const name = asString(rec.name) || (itemId != null ? `Item ${itemId}` : '')
    if (itemId == null) continue
    const preview = asRecord(rec.preview_item)
    const enchants: Array<{ id: number, name: string }> = []
    for (const row of [...asArray(rec.enchantments), ...asArray(preview?.enchantments)]) {
      const entry = asRecord(row)
      const id = asNumber(entry?.enchantment_id) ?? asNumber(entry?.id) ?? asNumber(asRecord(entry?.enchantment)?.id)
      const label = asString(entry?.display_string) || asString(asRecord(entry?.enchantment)?.name) || (id != null ? `Enchant ${id}` : '')
      if (id != null) enchants.push({ id, name: label })
    }
    const gems: Array<{ id: number, name: string }> = []
    for (const row of [...asArray(rec.sockets), ...asArray(preview?.sockets)]) {
      const entry = asRecord(row)
      const socketItem = asRecord(entry?.item)
      const id = asNumber(socketItem?.id) ?? asNumber(entry?.item_id)
      const label = asString(socketItem?.name) || asString(entry?.display_string) || (id != null ? `Gem ${id}` : '')
      if (id != null) gems.push({ id, name: label })
    }
    out.push({
      slot,
      itemId,
      name,
      quality: itemQuality(rec),
      setName: itemSetName(rec),
      crafted: itemCrafted(rec),
      embellished: itemEmbellished(rec),
      stats: collectItemStats(rec),
      enchants,
      gems,
    })
  }
  return out
}

export function absorbProfile(
  bucket: ProfileBucket,
  input: {
    specsBody: unknown
    equipmentBody: unknown
    characterBody?: unknown
  },
) {
  bucket.profiles += 1
  const loadouts = extractActiveLoadouts(input.specsBody)
  const seenTalent = new Set<string>()
  for (const loadout of loadouts) {
    if (loadout.code) increment(bucket.loadouts, loadout.code, loadout.code, loadout.hero ? { heroId: loadout.hero.id, heroName: loadout.hero.name } : {})
    if (loadout.hero) increment(bucket.heroes, String(loadout.hero.id), loadout.hero.name, { id: loadout.hero.id })
    for (const [tree, list] of [['class', loadout.classTalents], ['spec', loadout.specTalents], ['hero', loadout.heroTalents]] as const) {
      for (const talent of list) {
        const key = `${tree}:${talent.id}`
        if (seenTalent.has(key)) continue
        seenTalent.add(key)
        increment(bucket.talents[tree], String(talent.id), talent.name, { id: talent.id })
      }
    }
  }
  const race = raceFromCharacter(input.characterBody)
  if (race) increment(bucket.races, String(race.id), race.name, { id: race.id })

  const seenGear = new Set<string>()
  const seenEnchant = new Set<number>()
  const seenGem = new Set<number>()
  const statTotals = new Map<string, { name: string, value: number }>()
  for (const item of collectEquippedItems(input.equipmentBody)) {
    const key = `${item.slot}:${item.itemId}`
    if (!seenGear.has(key)) {
      seenGear.add(key)
      increment(bucket.gear, key, item.name, {
        itemId: item.itemId,
        slot: item.slot,
        quality: item.quality || '',
        setName: item.setName || '',
        crafted: item.crafted,
        embellished: item.embellished,
      })
      let mods = bucket.gearMods.get(key)
      if (!mods) {
        mods = { enchants: new Map(), gems: new Map() }
        bucket.gearMods.set(key, mods)
      }
      for (const enchant of item.enchants) increment(mods.enchants, String(enchant.id), enchant.name, { id: enchant.id })
      for (const gem of item.gems) increment(mods.gems, String(gem.id), gem.name, { id: gem.id })
    }
    for (const stat of item.stats) {
      const current = statTotals.get(stat.id)
      if (current) current.value += stat.value
      else statTotals.set(stat.id, { name: stat.name, value: stat.value })
    }
    for (const enchant of item.enchants) {
      if (seenEnchant.has(enchant.id)) continue
      seenEnchant.add(enchant.id)
      increment(bucket.enchants, String(enchant.id), enchant.name, { id: enchant.id })
    }
    for (const gem of item.gems) {
      if (seenGem.has(gem.id)) continue
      seenGem.add(gem.id)
      increment(bucket.gems, String(gem.id), gem.name, { id: gem.id })
    }
  }
  for (const [id, stat] of statTotals) {
    const current = bucket.stats.get(id)
    if (current) current.total += stat.value
    else bucket.stats.set(id, { name: stat.name, total: stat.value })
  }
}

function topTalentList(map: CountMap, total: number, tree: MetaTalentTree): MetaTalentCount[] {
  const denom = total > 0 ? total : 1
  return [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name))
    .slice(0, META_TOP_ITEMS)
    .map(([, entry]) => {
      const share = shareOf(entry.count, denom)
      return {
        id: Number(entry.extra.id),
        name: entry.name,
        count: entry.count,
        share,
        tree,
        band: talentBand(share),
      }
    })
}

function topNamed(map: CountMap, total: number, limit: number, toRow: (entry: CountEntry, share: number) => MetaEnchantGem | MetaRaceCount | MetaHeroSplit | MetaLoadout) {
  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
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

function toGear(entry: CountEntry, share: number, bucket?: ProfileBucket): MetaGearCount {
  const mods = gearModsFor(bucket, entry)
  const topEnchant = mods ? [...mods.enchants.values()].sort((a, b) => b.count - a.count)[0] : undefined
  const gems = mods
    ? [...mods.gems.values()].sort((a, b) => b.count - a.count).slice(0, 3).map(gem => ({ id: Number(gem.extra.id), name: gem.name }))
    : []
  return {
    slot: String(entry.extra.slot || ''),
    itemId: Number(entry.extra.itemId),
    name: entry.name,
    count: entry.count,
    share,
    quality: entry.extra.quality ? String(entry.extra.quality) : null,
    setName: entry.extra.setName ? String(entry.extra.setName) : null,
    crafted: entry.extra.crafted === true,
    embellished: entry.extra.embellished === true,
    enchant: topEnchant ? { id: Number(topEnchant.extra.id), name: topEnchant.name } : null,
    gems,
  }
}

function mergeSlotItems(map: CountMap, slots: Set<string>, total: number, bucket?: ProfileBucket): MetaGearCount[] {
  const merged = new Map<number, CountEntry>()
  for (const entry of map.values()) {
    if (!slots.has(String(entry.extra.slot))) continue
    const itemId = Number(entry.extra.itemId)
    const current = merged.get(itemId)
    if (current) current.count += entry.count
    else merged.set(itemId, { count: entry.count, name: entry.name, extra: { ...entry.extra, slot: 'COMBINED' } })
  }
  return [...merged.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, META_TOP_SLOT_ITEMS)
    .map(entry => toGear(entry, shareOf(entry.count, total), bucket))
}

function gearSlots(map: CountMap, total: number, bucket?: ProfileBucket): MetaSpecSummary['gearSlots'] {
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
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, META_TOP_SLOT_ITEMS)
      .map(entry => toGear(entry, shareOf(entry.count, total), bucket))
    return { slot, items }
  })
}

export function buildClassSummaries(
  specPop: Map<string, SpecPop>,
  profileBySpec: Map<string, ProfileBucket>,
  totalCharacters: number,
): MetaClassSummary[] {
  const byClass = new Map<string, MetaClassSummary>()
  for (const [specKey, pop] of specPop) {
    const classSlug = toMetaSlug(pop.className)
    const specSlug = toMetaSlug(pop.specName)
    if (!findMetaClass(classSlug)) continue
    let cls = byClass.get(classSlug)
    if (!cls) {
      cls = { slug: classSlug, name: pop.className, characterCount: 0, specs: [] }
      byClass.set(classSlug, cls)
    }
    cls.characterCount += pop.count
    const bucket = profileBySpec.get(specKey) ?? emptyProfileBucket()
    const profiles = bucket.profiles
    const talents = {
      class: topTalentList(bucket.talents.class, profiles, 'class'),
      spec: topTalentList(bucket.talents.spec, profiles, 'spec'),
      hero: topTalentList(bucket.talents.hero, profiles, 'hero'),
    }
    const loadouts = topNamed(bucket.loadouts, profiles, 6, (entry, share) => ({
      code: entry.name,
      count: entry.count,
      share,
      heroTree: typeof entry.extra.heroId === 'number'
        ? { id: Number(entry.extra.heroId), name: String(entry.extra.heroName || '') }
        : null,
    })) as MetaLoadout[]
    const heroSplit = topNamed(bucket.heroes, profiles, 6, (entry, share) => ({
      id: Number(entry.extra.id),
      name: entry.name,
      count: entry.count,
      share,
    })) as MetaHeroSplit[]
    const stats: MetaStatBar[] = [...bucket.stats.entries()]
      .map(([id, stat]) => ({ id, name: stat.name, average: profiles ? Math.round(stat.total / profiles) : 0 }))
      .sort((a, b) => b.average - a.average || a.name.localeCompare(b.name))
    const enchants = topNamed(bucket.enchants, profiles, META_TOP_SLOT_ITEMS, (entry, share) => ({
      id: Number(entry.extra.id),
      name: entry.name,
      count: entry.count,
      share,
    })) as MetaEnchantGem[]
    const gems = topNamed(bucket.gems, profiles, META_TOP_SLOT_ITEMS, (entry, share) => ({
      id: Number(entry.extra.id),
      name: entry.name,
      count: entry.count,
      share,
    })) as MetaEnchantGem[]
    const races = topNamed(bucket.races, profiles, META_TOP_ITEMS, (entry, share) => ({
      id: Number(entry.extra.id),
      name: entry.name,
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
    )

    cls.specs.push({
      slug: specSlug,
      name: pop.specName,
      characterCount: pop.count,
      share: shareOf(pop.count, totalCharacters),
      profileCount: profiles,
      belowMinSample: pop.count < META_MIN_SAMPLE,
      keyLevels: keyLevelsOf(pop.keyLevels),
      heroSplit,
      loadouts,
      talents,
      stats,
      gearSlots: gearSlots(bucket.gear, profiles, bucket),
      trinkets: mergeSlotItems(bucket.gear, TRINKET_SLOTS, profiles, bucket),
      rings: mergeSlotItems(bucket.gear, RING_SLOTS, profiles, bucket),
      embellishments,
      enchants,
      gems,
      races,
    })
  }
  for (const cls of byClass.values()) {
    cls.specs.sort((a, b) => b.characterCount - a.characterCount || a.name.localeCompare(b.name))
  }
  return [...byClass.values()].sort((a, b) => b.characterCount - a.characterCount || a.name.localeCompare(b.name))
}

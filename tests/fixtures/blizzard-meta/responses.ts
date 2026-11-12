/**
 * Fixture Blizzard payloads for unit tests. No network.
 */

import { encodeLoadoutHeader } from '../../../utils/metaLoadout'

export const FIXTURE_CREDENTIALS = { id: 'test-client-id', secret: 'test-client-secret' }

export const FIXTURE_TREE_HASH = 'c0ffee00c0ffee00c0ffee00c0ffee00'
export const FIXTURE_STALE_HASH = 'aabbccddaabbccddaabbccddaabbccdd'

export const FIXTURE_LOADOUT = {
  fireA: encodeLoadoutHeader(1, 63, FIXTURE_TREE_HASH),
  fireB: encodeLoadoutHeader(1, 63, FIXTURE_TREE_HASH),
  fireStale: encodeLoadoutHeader(1, 63, FIXTURE_STALE_HASH),
  arcane: encodeLoadoutHeader(1, 62, FIXTURE_TREE_HASH),
  frost: encodeLoadoutHeader(1, 64, FIXTURE_TREE_HASH),
  prot: encodeLoadoutHeader(1, 73, FIXTURE_TREE_HASH),
  shadow: encodeLoadoutHeader(1, 258, FIXTURE_TREE_HASH),
}

function member(name: string, realm: string, specId: number, specName: string, id: number) {
  return {
    profile: { id, name, realm: { slug: realm, name: realm } },
    specialization: { id: specId, name: specName },
  }
}

function group(level: number, members: ReturnType<typeof member>[], stamp = 1_700_000_000_000, duration = 1_800_000) {
  return { keystone_level: level, members, completed_timestamp: stamp, duration }
}

export const FIXTURE_TOKEN = { access_token: 'fixture-access-token', expires_in: 3600, token_type: 'bearer' }

export const FIXTURE_SEASON_INDEX = { current_season: { id: 14 } }
export const FIXTURE_SEASON = {
  id: 14,
  name: 'Season 14',
  season_name: 'Season 14',
  periods: [{ id: 997 }, { id: 998 }, { id: 999 }],
}
export const FIXTURE_PERIOD_INDEX = { current_period: { id: 999 } }

export const FIXTURE_REALM_INDEX = {
  connected_realms: [
    { href: 'https://eu.api.blizzard.com/data/wow/connected-realm/509?namespace=dynamic-eu' },
    { href: 'https://eu.api.blizzard.com/data/wow/connected-realm/1305?namespace=dynamic-eu' },
  ],
}

export const FIXTURE_BOARD_INDEX = {
  current_leaderboards: [
    { id: 401, name: 'The Azure Vault', map: { id: 401, name: 'The Azure Vault' }, period: { id: 999 } },
    { id: 402, name: "Algeth'ar Academy", map: { id: 402, name: "Algeth'ar Academy" }, period: { id: 999 } },
  ],
}

export const FIXTURE_BOARD_401 = {
  period: { id: 999 },
  leading_groups: [
    group(20, [
      member('Fireone', 'twisting-nether', 63, 'Fire', 101),
      member('Firetwo', 'twisting-nether', 63, 'Fire', 102),
      member('Arcaneone', 'twisting-nether', 62, 'Arcane', 103),
      member('Protone', 'kazzak', 73, 'Protection', 104),
      member('Firemismatch', 'kazzak', 63, 'Fire', 108),
    ]),
    group(18, [
      member('Firethree', 'kazzak', 63, 'Fire', 105),
      member('Frostone', 'kazzak', 64, 'Frost', 106),
      member('Firestale', 'twisting-nether', 63, 'Fire', 109),
    ]),
  ],
}

export const FIXTURE_BOARD_402 = {
  period: { id: 999 },
  leading_groups: [
    group(19, [
      member('Fireone', 'twisting-nether', 63, 'Fire', 101),
      member('Shadowone', 'twisting-nether', 258, 'Shadow', 107),
    ]),
  ],
}

function talentNode(id: number, name: string, spellId?: number, nodeId?: number, extra: Record<string, unknown> = {}) {
  return {
    id: nodeId ?? id,
    talent: { id, name },
    tooltip: {
      talent: { id, name },
      spell_tooltip: spellId != null ? { spell: { id: spellId } } : undefined,
    },
    ...extra,
  }
}

export function fixtureSpecializations(
  specId: number,
  specName: string,
  talentIds: number[],
  loadoutCode: string,
  hero?: { id: number, name: string },
  extraTalents: unknown[] = [],
) {
  return {
    active_specialization: { id: specId, name: specName },
    specializations: [
      {
        specialization: { id: specId, name: specName },
        loadouts: [
          {
            is_active: true,
            talent_loadout_code: loadoutCode,
            hero_talent_tree: hero ?? { id: 800, name: 'Sunfury' },
            selected_class_talents: [
              ...talentIds.slice(0, 2).map(id => talentNode(id, `Talent ${id}`, 50_000 + id, id)),
              ...extraTalents,
            ],
            selected_spec_talents: talentIds.slice(2, 3).map(id => talentNode(id, `Talent ${id}`, 50_000 + id, id)),
            selected_hero_talents: talentIds.slice(3).map(id => talentNode(id, `Talent ${id}`, 50_000 + id, id)),
          },
        ],
      },
    ],
  }
}

export function fixtureEquipment(items: Array<{
  slot: string, id: number, name: string, quality?: string, setName?: string, crafted?: boolean,
  enchant?: { id: number, name: string }, gems?: Array<{ id: number, name: string }>,
  stats?: Array<{ type: string, value: number }>, ilvl?: number, context?: string, icon?: string
}>) {
  return {
    equipped_items: items.map(item => ({
      slot: { type: item.slot, name: item.slot },
      item: { id: item.id },
      name: item.name,
      quality: { type: item.quality || 'EPIC', name: item.quality || 'Epic' },
      level: { value: item.ilvl ?? 668 },
      context: item.context || 'MYTHIC_PLUS',
      set: item.setName ? { item_set: { name: item.setName } } : undefined,
      crafted: item.crafted || false,
      media: item.icon ? { assets: [{ key: 'icon', value: `https://render.worldofwarcraft.com/icons/56/${item.icon}.jpg` }] } : undefined,
      enchantments: item.enchant ? [{ enchantment_id: item.enchant.id, display_string: item.enchant.name }] : [],
      sockets: (item.gems || []).map(gem => ({ item: { id: gem.id, name: gem.name } })),
      stats: item.stats
        ? item.stats.map(stat => ({ type: { type: stat.type, name: stat.type }, value: stat.value }))
        : [
            { type: { type: 'CRIT_RATING', name: 'Critical Strike' }, value: 200 },
            { type: { type: 'HASTE_RATING', name: 'Haste' }, value: 150 },
          ],
    })),
  }
}

export function fixtureCharacter(race: { id: number, name: string }, specId: number, specName: string) {
  return {
    race: { id: race.id, name: race.name },
    active_spec: { id: specId, name: specName },
    equipped_item_level: 668,
  }
}

function fixtureMedia(icon: string) {
  return { assets: [{ key: 'icon', value: `https://render.worldofwarcraft.com/icons/56/${icon}.jpg` }] }
}

export const FIXTURE_ITEM_MEDIA: Record<number, unknown> = {
  22001: fixtureMedia('inv_helm_cinders'),
  22002: fixtureMedia('inv_chest_embers'),
  22003: fixtureMedia('inv_chest_other'),
  22010: fixtureMedia('inv_jewelry_ember'),
  23001: fixtureMedia('inv_helm_arcane'),
  24001: fixtureMedia('inv_helm_frost'),
  25001: fixtureMedia('inv_helm_plate'),
  26001: fixtureMedia('inv_helm_shadow'),
}

export const FIXTURE_SPEC_INDEX = {
  character_specializations: [
    { id: 62, name: 'Arcane' },
    { id: 63, name: 'Fire' },
    { id: 64, name: 'Frost' },
    { id: 73, name: 'Protection' },
    { id: 258, name: 'Shadow' },
  ],
}

export function fixturePlayableSpec(id: number, name: string, classId: number, className: string, role: string) {
  return {
    id,
    name,
    playable_class: { id: classId, name: className },
    role: { type: role },
    spec_talent_tree: {
      key: { href: `https://eu.api.blizzard.com/data/wow/talent-tree/1000/playable-specialization/${id}?namespace=static-eu` },
    },
  }
}

export const FIXTURE_PLAYABLE_SPECS: Record<number, unknown> = {
  62: fixturePlayableSpec(62, 'Arcane', 8, 'Mage', 'DPS'),
  63: fixturePlayableSpec(63, 'Fire', 8, 'Mage', 'DPS'),
  64: fixturePlayableSpec(64, 'Frost', 8, 'Mage', 'DPS'),
  73: fixturePlayableSpec(73, 'Protection', 1, 'Warrior', 'TANK'),
  258: fixturePlayableSpec(258, 'Shadow', 5, 'Priest', 'DPS'),
}

function layoutNode(id: number, type = 'ACTIVE', talentId?: number, spellId?: number, choices = true) {
  const tooltip = talentId != null
    ? { talent: { id: talentId, name: `Talent ${talentId}` }, spell_tooltip: spellId != null ? { spell: { id: spellId } } : undefined }
    : undefined
  return {
    id,
    display_row: 1,
    display_col: 1,
    node_type: { type },
    ranks: [{ rank: 1, tooltip: choices ? tooltip : undefined, choice_of_tooltips: type === 'CHOICE' ? [] : undefined }],
    unlocks: [],
  }
}

/** Fire tree: published nodes plus a class-tree CHOICE node with no published choices (live API shape). */
export const FIXTURE_TALENT_TREE_FIRE = {
  class_talent_nodes: [
    layoutNode(101, 'ACTIVE', 101, 50101),
    layoutNode(102, 'ACTIVE', 102, 50102),
    layoutNode(103, 'ACTIVE', 103, 50103),
    layoutNode(99830, 'CHOICE'),
  ],
  spec_talent_nodes: [
    layoutNode(201, 'ACTIVE', 201, 50201),
    layoutNode(202, 'ACTIVE', 202, 50202),
  ],
  hero_talent_trees: [
    {
      id: 800,
      name: 'Sunfury',
      playable_specializations: [{ id: 63 }],
      hero_talent_nodes: [layoutNode(901, 'ACTIVE', 901, 50901)],
    },
    {
      id: 801,
      name: 'Spellslinger',
      playable_specializations: [{ id: 63 }],
      hero_talent_nodes: [layoutNode(902, 'ACTIVE', 902, 50902)],
    },
  ],
}

export function fixtureTalentTree(ids: number[]) {
  return {
    class_talent_nodes: ids.map(id => layoutNode(id, 'ACTIVE', id, 50_000 + id)),
    spec_talent_nodes: [],
    hero_talent_trees: [],
  }
}

export const FIXTURE_TALENT_TREES: Record<number, unknown> = {
  62: fixtureTalentTree([301, 302]),
  63: FIXTURE_TALENT_TREE_FIRE,
  64: fixtureTalentTree([401]),
  73: fixtureTalentTree([501]),
  258: fixtureTalentTree([601]),
}

const unmappedPick = {
  id: 55555,
  talent: { id: 55555, name: 'Unlisted choice' },
  tooltip: {
    talent: { id: 55555, name: 'Unlisted choice' },
    spell_tooltip: { spell: { id: 55555 } },
  },
}

export const FIXTURE_PROFILES: Record<string, { specs: unknown, equipment: unknown, character: unknown }> = {
  'twisting-nether/fireone': {
    specs: fixtureSpecializations(63, 'Fire', [101, 102, 201, 901], FIXTURE_LOADOUT.fireA, { id: 800, name: 'Sunfury' }, [unmappedPick]),
    equipment: fixtureEquipment([
      { slot: 'HEAD', id: 22001, name: 'Crown of Cinders', quality: 'EPIC', setName: 'Cinder Set', enchant: { id: 90, name: 'Enchant Helm' }, ilvl: 668, icon: 'inv_helm_cinders' },
      { slot: 'CHEST', id: 22002, name: 'Robes of Embers', ilvl: 665 },
    ]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }, 63, 'Fire'),
  },
  'twisting-nether/firetwo': {
    specs: fixtureSpecializations(63, 'Fire', [101, 103, 201, 901], FIXTURE_LOADOUT.fireA),
    equipment: fixtureEquipment([
      { slot: 'HEAD', id: 22001, name: 'Crown of Cinders', quality: 'EPIC', setName: 'Cinder Set', enchant: { id: 90, name: 'Enchant Helm' }, ilvl: 668 },
      { slot: 'CHEST', id: 22003, name: 'Other Robes', ilvl: 664 },
    ]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }, 63, 'Fire'),
  },
  'kazzak/firethree': {
    specs: fixtureSpecializations(63, 'Fire', [101, 102, 202, 902], FIXTURE_LOADOUT.fireB, { id: 801, name: 'Spellslinger' }),
    equipment: fixtureEquipment([
      { slot: 'HEAD', id: 22001, name: 'Crown of Cinders', quality: 'EPIC', setName: 'Cinder Set', enchant: { id: 90, name: 'Enchant Helm' }, ilvl: 670 },
      { slot: 'NECK', id: 22010, name: 'Ember Pendant', ilvl: 662 },
    ]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }, 63, 'Fire'),
  },
  'twisting-nether/firestale': {
    specs: fixtureSpecializations(63, 'Fire', [101, 102, 201, 901], FIXTURE_LOADOUT.fireStale),
    equipment: fixtureEquipment([{ slot: 'HEAD', id: 22001, name: 'Crown of Cinders', ilvl: 660 }]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }, 63, 'Fire'),
  },
  'kazzak/firemismatch': {
    specs: fixtureSpecializations(64, 'Frost', [401], FIXTURE_LOADOUT.frost),
    equipment: fixtureEquipment([{ slot: 'HEAD', id: 24001, name: 'Frost Crown' }]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }, 64, 'Frost'),
  },
  'twisting-nether/arcaneone': {
    specs: fixtureSpecializations(62, 'Arcane', [301, 302], FIXTURE_LOADOUT.arcane),
    equipment: fixtureEquipment([{ slot: 'HEAD', id: 23001, name: 'Arcane Circlet' }]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }, 62, 'Arcane'),
  },
  'kazzak/frostone': {
    specs: fixtureSpecializations(64, 'Frost', [401], FIXTURE_LOADOUT.frost),
    equipment: fixtureEquipment([{ slot: 'HEAD', id: 24001, name: 'Frost Crown' }]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }, 64, 'Frost'),
  },
  'kazzak/protone': {
    specs: fixtureSpecializations(73, 'Protection', [501], FIXTURE_LOADOUT.prot),
    equipment: fixtureEquipment([{ slot: 'HEAD', id: 25001, name: 'War Helm' }]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }, 73, 'Protection'),
  },
  'twisting-nether/shadowone': {
    specs: fixtureSpecializations(258, 'Shadow', [601], FIXTURE_LOADOUT.shadow),
    equipment: fixtureEquipment([{ slot: 'HEAD', id: 26001, name: 'Shadow Hood' }]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }, 258, 'Shadow'),
  },
}

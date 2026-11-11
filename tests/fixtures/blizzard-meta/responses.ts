/**
 * Fixture Blizzard payloads for unit tests. No network.
 */

export const FIXTURE_CREDENTIALS = { id: 'test-client-id', secret: 'test-client-secret' }

function member(name: string, realm: string, specId: number, specName: string) {
  return {
    profile: { name, realm: { slug: realm, name: realm } },
    specialization: { id: specId, name: specName },
  }
}

function group(level: number, members: ReturnType<typeof member>[]) {
  return { keystone_level: level, members }
}

export const FIXTURE_TOKEN = { access_token: 'fixture-access-token', expires_in: 3600, token_type: 'bearer' }

export const FIXTURE_SEASON_INDEX = { current_season: { id: 14 } }
export const FIXTURE_SEASON = { id: 14, name: 'Season 14' }
export const FIXTURE_PERIOD_INDEX = { current_period: { id: 999 } }

export const FIXTURE_REALM_INDEX = {
  connected_realms: [
    { href: 'https://eu.api.blizzard.com/data/wow/connected-realm/509?namespace=dynamic-eu' },
    { href: 'https://eu.api.blizzard.com/data/wow/connected-realm/1305?namespace=dynamic-eu' },
  ],
}

export const FIXTURE_BOARD_INDEX = {
  current_leaderboards: [
    { map: { id: 401, name: 'The Azure Vault' }, period: { id: 999 } },
    { map: { id: 402, name: 'Algeth\'ar Academy' }, period: { id: 999 } },
  ],
}

export const FIXTURE_BOARD_401 = {
  period: { id: 999 },
  leading_groups: [
    group(20, [
      member('Fireone', 'twisting-nether', 63, 'Fire'),
      member('Firetwo', 'twisting-nether', 63, 'Fire'),
      member('Arcaneone', 'twisting-nether', 62, 'Arcane'),
      member('Protone', 'kazzak', 73, 'Protection'),
    ]),
    group(18, [
      member('Firethree', 'kazzak', 63, 'Fire'),
      member('Frostone', 'kazzak', 64, 'Frost'),
    ]),
  ],
}

export const FIXTURE_BOARD_402 = {
  period: { id: 999 },
  leading_groups: [
    group(19, [
      member('Fireone', 'twisting-nether', 63, 'Fire'),
      member('Shadowone', 'twisting-nether', 258, 'Shadow'),
    ]),
  ],
}

export function fixtureSpecializations(specId: number, specName: string, talentIds: number[], loadoutCode: string, hero?: { id: number, name: string }) {
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
            selected_class_talents: talentIds.slice(0, 2).map(id => ({ talent: { id, name: `Talent ${id}` } })),
            selected_spec_talents: talentIds.slice(2, 3).map(id => ({ talent: { id, name: `Talent ${id}` } })),
            selected_hero_talents: talentIds.slice(3).map(id => ({ talent: { id, name: `Talent ${id}` } })),
          },
        ],
      },
    ],
  }
}

export function fixtureEquipment(items: Array<{ slot: string, id: number, name: string, quality?: string, setName?: string, crafted?: boolean, enchant?: { id: number, name: string }, gems?: Array<{ id: number, name: string }>, stats?: Array<{ type: string, value: number }> }>) {
  return {
    equipped_items: items.map(item => ({
      slot: { type: item.slot, name: item.slot },
      item: { id: item.id },
      name: item.name,
      quality: { type: item.quality || 'EPIC', name: item.quality || 'Epic' },
      set: item.setName ? { item_set: { name: item.setName } } : undefined,
      crafted: item.crafted || false,
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

export function fixtureCharacter(race: { id: number, name: string }) {
  return { race: { id: race.id, name: race.name } }
}

export const FIXTURE_PROFILES: Record<string, { specs: unknown, equipment: unknown, character: unknown }> = {
  'twisting-nether/fireone': {
    specs: fixtureSpecializations(63, 'Fire', [101, 102, 201, 901], 'CODE-FIRE-A'),
    equipment: fixtureEquipment([
      { slot: 'HEAD', id: 22001, name: 'Crown of Cinders', quality: 'EPIC', setName: 'Cinder Set', enchant: { id: 90, name: 'Enchant Helm' } },
      { slot: 'CHEST', id: 22002, name: 'Robes of Embers' },
    ]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }),
  },
  'twisting-nether/firetwo': {
    specs: fixtureSpecializations(63, 'Fire', [101, 103, 201, 901], 'CODE-FIRE-A'),
    equipment: fixtureEquipment([
      { slot: 'HEAD', id: 22001, name: 'Crown of Cinders', quality: 'EPIC', setName: 'Cinder Set', enchant: { id: 90, name: 'Enchant Helm' } },
      { slot: 'CHEST', id: 22003, name: 'Other Robes' },
    ]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }),
  },
  'kazzak/firethree': {
    specs: fixtureSpecializations(63, 'Fire', [101, 102, 202, 902], 'CODE-FIRE-B', { id: 801, name: 'Spellslinger' }),
    equipment: fixtureEquipment([
      { slot: 'HEAD', id: 22001, name: 'Crown of Cinders', quality: 'EPIC', setName: 'Cinder Set', enchant: { id: 90, name: 'Enchant Helm' } },
      { slot: 'NECK', id: 22010, name: 'Ember Pendant' },
    ]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }),
  },
  'twisting-nether/arcaneone': {
    specs: fixtureSpecializations(62, 'Arcane', [301, 302], 'CODE-ARC'),
    equipment: fixtureEquipment([{ slot: 'HEAD', id: 23001, name: 'Arcane Circlet' }]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }),
  },
  'kazzak/frostone': {
    specs: fixtureSpecializations(64, 'Frost', [401], 'CODE-FROST'),
    equipment: fixtureEquipment([{ slot: 'HEAD', id: 24001, name: 'Frost Crown' }]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }),
  },
  'kazzak/protone': {
    specs: fixtureSpecializations(73, 'Protection', [501], 'CODE-PROT'),
    equipment: fixtureEquipment([{ slot: 'HEAD', id: 25001, name: 'War Helm' }]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }),
  },
  'twisting-nether/shadowone': {
    specs: fixtureSpecializations(258, 'Shadow', [601], 'CODE-SHADOW'),
    equipment: fixtureEquipment([{ slot: 'HEAD', id: 26001, name: 'Shadow Hood' }]),
    character: fixtureCharacter({ id: 4, name: 'Gnome' }),
  },
}

/**
 * Synthetic EU-scale pre-spec Blizzard payloads for heap measurement.
 * No network, no prod secrets. Board shape follows the post-2018 Game Data
 * API (top-500 leading_groups cap per connected-realm / dungeon / period).
 *
 * Documented / known sizes:
 * - Token, season index, season body, period index, board index: a few KB.
 * - Connected-realm index: ~267 EU hrefs, tens of KB.
 * - One full 500-group leaderboard: about 1–2 MB of JSON (5 members × hrefs).
 *   Blizzard caps leading_groups at 500 (Raider.IO / official 2018 change).
 * - In 15.6 s at 40 rps / 16 concurrency the live job can fetch on the order
 *   of 600 boards after the token + 5 index calls — mid leaderboard ingest,
 *   before playable-specialization or any profile. specsWithData stays 0.
 */

import { BLIZZARD_SPEC_BY_ID } from '../../../utils/metaCatalog'
import type { BlizzardFetcher, BlizzardHttpResponse } from '../../../server/utils/blizzardHttp'
import {
  FIXTURE_PERIOD_INDEX,
  FIXTURE_SEASON,
  FIXTURE_SEASON_INDEX,
  FIXTURE_TOKEN,
  fixturePlayableSpec,
} from './responses'

/** Approximate EU connected-realm count used as the production job shape. */
export const PRE_SPEC_REALM_COUNT = 267
export const PRE_SPEC_DUNGEON_COUNT = 8
export const PRE_SPEC_PERIOD_COUNT = 3
export const PRE_SPEC_LEADERBOARD_CAP = 500
export const PRE_SPEC_DUNGEON_IDS = [401, 402, 403, 404, 405, 406, 407, 408] as const
export const PRE_SPEC_PERIOD_IDS = [997, 998, 999] as const

/** 80×8×3 boards × 42 groups × 5 unique members = 403 200 players, no reuse. */
export const PRE_SPEC_400K_REALM_COUNT = 80
export const PRE_SPEC_400K_GROUPS = 42
export const PRE_SPEC_400K_UNIQUE = PRE_SPEC_400K_REALM_COUNT * PRE_SPEC_DUNGEON_COUNT * PRE_SPEC_PERIOD_COUNT * PRE_SPEC_400K_GROUPS * 5

export const PRE_SPEC_SPECS = Object.entries(BLIZZARD_SPEC_BY_ID)
  .map(([id, meta]) => ({ specId: Number(id), ...meta }))
  .sort((a, b) => a.specId - b.specId)

function headers(): { get(name: string): string | null } {
  return { get: () => null }
}

function ok(body: unknown): BlizzardHttpResponse {
  return { status: 200, headers: headers(), body }
}

/** Popular / mid / quiet mix. Only megaservers fill the 500 cap every week. */
export function groupsForRealmIndex(index: number): number {
  if (index < 30) return PRE_SPEC_LEADERBOARD_CAP
  if (index < 110) return 150
  return 40
}

export function expectedUniqueCandidates(realmCount = PRE_SPEC_REALM_COUNT): number {
  let total = 0
  for (let i = 0; i < realmCount; i++) total += groupsForRealmIndex(i) * 5
  return total
}

function member(realmId: number, playerIndex: number, specIndex: number) {
  const spec = PRE_SPEC_SPECS[specIndex % PRE_SPEC_SPECS.length]!
  return {
    faction: { type: playerIndex % 2 === 0 ? 'HORDE' : 'ALLIANCE' },
    profile: {
      id: realmId * 100_000 + playerIndex,
      name: `P${realmId}n${playerIndex}`,
      realm: {
        id: realmId,
        key: { href: `https://eu.api.blizzard.com/data/wow/realm/${realmId}?namespace=dynamic-eu` },
        slug: `realm-${realmId}`,
      },
    },
    specialization: {
      id: spec.specId,
      key: { href: `https://eu.api.blizzard.com/data/wow/playable-specialization/${spec.specId}?namespace=static-eu` },
    },
  }
}

export function createLeaderboardBoard(realmId: number, dungeonId: number, periodId: number, groups: number) {
  const pool = groups * 5
  const leading_groups = Array.from({ length: groups }, (_, rank) => ({
    ranking: rank + 1,
    completed_timestamp: 1_700_000_000_000 + periodId * 10_000 + dungeonId * 500 + rank,
    duration: 1_800_000 + (rank % 17) * 1000,
    keystone_level: 8 + (rank % 18),
    members: Array.from({ length: 5 }, (_, slot) => {
      const playerIndex = (rank * 5 + slot) % pool
      return member(realmId, playerIndex, rank + slot)
    }),
  }))
  return {
    _links: {
      self: {
        href: `https://eu.api.blizzard.com/data/wow/connected-realm/${realmId}/mythic-leaderboard/${dungeonId}/period/${periodId}?namespace=dynamic-eu`,
      },
    },
    connected_realm: { href: `https://eu.api.blizzard.com/data/wow/connected-realm/${realmId}?namespace=dynamic-eu` },
    map: { id: dungeonId, name: `Dungeon ${dungeonId}` },
    map_challenge_mode_id: dungeonId,
    name: `Dungeon ${dungeonId}`,
    period: periodId,
    period_start_timestamp: 1_700_000_000_000,
    period_end_timestamp: 1_700_604_800_000,
    keystone_affixes: [
      { keystone_affix: { id: 9, key: { href: 'https://eu.api.blizzard.com/data/wow/keystone-affix/9?namespace=static-eu' }, name: 'Tyrannical' }, starting_level: 2 },
      { keystone_affix: { id: 7, key: { href: 'https://eu.api.blizzard.com/data/wow/keystone-affix/7?namespace=static-eu' }, name: 'Bolstering' }, starting_level: 4 },
      { keystone_affix: { id: 10, key: { href: 'https://eu.api.blizzard.com/data/wow/keystone-affix/10?namespace=static-eu' }, name: 'Fortified' }, starting_level: 7 },
      { keystone_affix: { id: 148, key: { href: 'https://eu.api.blizzard.com/data/wow/keystone-affix/148?namespace=static-eu' }, name: 'Xal\'atath' }, starting_level: 10 },
    ],
    leading_groups,
  }
}

export function fullLeaderboardJsonBytes(): number {
  return Buffer.byteLength(JSON.stringify(createLeaderboardBoard(1305, 401, 999, PRE_SPEC_LEADERBOARD_CAP)), 'utf8')
}

export function createPreSpecHeapFetcher(options?: {
  realmCount?: number
  uniqueAcrossBoards?: boolean
  groupsForRealm?: (index: number) => number
}): BlizzardFetcher {
  const realmCount = options?.realmCount ?? PRE_SPEC_REALM_COUNT
  const groupsOf = options?.groupsForRealm ?? groupsForRealmIndex
  const uniqueAcrossBoards = options?.uniqueAcrossBoards === true
  const realmIndex = {
    connected_realms: Array.from({ length: realmCount }, (_, index) => ({
      href: `https://eu.api.blizzard.com/data/wow/connected-realm/${1000 + index}?namespace=dynamic-eu`,
    })),
  }
  const boardIndex = {
    current_leaderboards: PRE_SPEC_DUNGEON_IDS.map(id => ({ id, name: `Dungeon ${id}`, map: { id } })),
  }
  const specIndex = { character_specializations: PRE_SPEC_SPECS.map(spec => ({ id: spec.specId, name: spec.specName })) }
  const playable: Record<number, unknown> = {}
  for (const spec of PRE_SPEC_SPECS) {
    playable[spec.specId] = fixturePlayableSpec(spec.specId, spec.specName, 1, spec.className, 'DPS')
  }

  return async (input) => {
    if (input.url.includes('oauth.battle.net/token')) return ok(FIXTURE_TOKEN)
    const url = input.url
    if (url.includes('/mythic-keystone/season/index')) return ok(FIXTURE_SEASON_INDEX)
    if (url.includes('/mythic-keystone/season/14')) return ok(FIXTURE_SEASON)
    if (url.includes('/mythic-keystone/period/index')) return ok(FIXTURE_PERIOD_INDEX)
    if (url.includes('/connected-realm/index')) return ok(realmIndex)
    if (/connected-realm\/\d+\/mythic-leaderboard\/index/.test(url)) return ok(boardIndex)
    const boardMatch = url.match(/connected-realm\/(\d+)\/mythic-leaderboard\/(\d+)\/period\/(\d+)/)
    if (boardMatch) {
      const realmId = Number(boardMatch[1])
      const dungeonId = Number(boardMatch[2])
      const periodId = Number(boardMatch[3])
      const realmIndexInRange = realmId - 1000
      const groups = groupsOf(realmIndexInRange)
      const board = createLeaderboardBoard(realmId, dungeonId, periodId, groups)
      if (uniqueAcrossBoards) {
        for (const group of board.leading_groups) {
          for (const member of group.members) {
            member.profile.name = `${member.profile.name}d${dungeonId}p${periodId}`
            member.profile.id = member.profile.id * 1000 + dungeonId * 3 + (periodId % 3)
          }
        }
      }
      return ok(board)
    }
    if (url.includes('/playable-specialization/index')) return ok(specIndex)
    const playableMatch = url.match(/\/playable-specialization\/(\d+)/)
    if (playableMatch && !url.includes('/talent-tree/')) {
      const body = playable[Number(playableMatch[1])]
      if (body) return ok(body)
    }
    throw new Error(`Unexpected pre-spec fixture URL: ${url}`)
  }
}

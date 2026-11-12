/**
 * Synthetic Blizzard responses for a 40-spec × 200-sample memory test.
 * Equipment bodies are padded so retaining every raw profile would exceed
 * the heap-growth budget, while per-spec aggregates stay small.
 */

import { BLIZZARD_SPEC_BY_ID } from '../../../utils/metaCatalog'
import { encodeLoadoutHeader } from '../../../utils/metaLoadout'
import type { BlizzardFetcher, BlizzardHttpResponse } from '../../../server/utils/blizzardHttp'
import {
  FIXTURE_PERIOD_INDEX,
  FIXTURE_SEASON,
  FIXTURE_SEASON_INDEX,
  FIXTURE_TOKEN,
  FIXTURE_TREE_HASH,
  fixtureCharacter,
  fixtureEquipment,
  fixturePlayableSpec,
  fixtureSpecializations,
  fixtureTalentTree,
} from './responses'

export const HEAP_SPEC_COUNT = 40
export const HEAP_SAMPLES_PER_SPEC = 200
export const HEAP_PAD_BYTES = 16 * 1024
export const HEAP_REALM = 'heap-realm'
export const HEAP_REALM_ID = 509
export const HEAP_DUNGEON_ID = 401

export const HEAP_SPECS = Object.entries(BLIZZARD_SPEC_BY_ID)
  .map(([id, meta]) => ({ specId: Number(id), ...meta }))
  .sort((a, b) => a.specId - b.specId)
  .slice(0, HEAP_SPEC_COUNT)

function headers(): { get(name: string): string | null } {
  return { get: () => null }
}

function ok(body: unknown): BlizzardHttpResponse {
  return { status: 200, headers: headers(), body }
}

export function heapCharacterKey(specId: number, index: number): string {
  return `${HEAP_REALM}/s${specId}p${index}`
}

export function createHeapFixtureFetcher(options?: { padBytes?: number, uniquePad?: boolean }): BlizzardFetcher {
  const padBytes = options?.padBytes ?? HEAP_PAD_BYTES
  const pad = 'x'.repeat(padBytes)
  const uniquePad = options?.uniquePad === true
  const loadouts = new Map<number, string>()
  const playable: Record<number, unknown> = {}
  const trees: Record<number, unknown> = {}
  for (const spec of HEAP_SPECS) {
    loadouts.set(spec.specId, encodeLoadoutHeader(1, spec.specId, FIXTURE_TREE_HASH))
    playable[spec.specId] = fixturePlayableSpec(spec.specId, spec.specName, 1, spec.className, 'DPS')
    trees[spec.specId] = fixtureTalentTree([spec.specId * 10 + 1, spec.specId * 10 + 2])
  }

  const groups = HEAP_SPECS.flatMap((spec) =>
    Array.from({ length: HEAP_SAMPLES_PER_SPEC }, (_, index) => ({
      keystone_level: 10 + (index % 10),
      completed_timestamp: 1_700_000_000_000 + spec.specId * 1000 + index,
      duration: 1_800_000,
      members: [{
        profile: {
          id: spec.specId * 1000 + index,
          name: `s${spec.specId}p${index}`,
          realm: { slug: HEAP_REALM, name: HEAP_REALM },
        },
        specialization: { id: spec.specId, name: spec.specName },
      }],
    })),
  )

  const board = { period: { id: 999 }, leading_groups: groups }
  const realmIndex = {
    connected_realms: [{ href: `https://eu.api.blizzard.com/data/wow/connected-realm/${HEAP_REALM_ID}?namespace=dynamic-eu` }],
  }
  const boardIndex = { current_leaderboards: [{ id: HEAP_DUNGEON_ID, name: 'Heap Dungeon', map: { id: HEAP_DUNGEON_ID } }] }
  const specIndex = { character_specializations: HEAP_SPECS.map(spec => ({ id: spec.specId, name: spec.specName })) }

  return async (input) => {
    if (input.url.includes('oauth.battle.net/token')) return ok(FIXTURE_TOKEN)
    const url = input.url
    if (url.includes('/mythic-keystone/season/index')) return ok(FIXTURE_SEASON_INDEX)
    if (url.includes('/mythic-keystone/season/14')) return ok(FIXTURE_SEASON)
    if (url.includes('/mythic-keystone/period/index')) return ok(FIXTURE_PERIOD_INDEX)
    if (url.includes('/connected-realm/index')) return ok(realmIndex)
    if (/connected-realm\/\d+\/mythic-leaderboard\/index/.test(url)) return ok(boardIndex)
    if (url.includes(`/mythic-leaderboard/${HEAP_DUNGEON_ID}/`)) return ok(board)
    if (url.includes('/playable-specialization/index')) return ok(specIndex)
    const playableMatch = url.match(/\/playable-specialization\/(\d+)/)
    if (playableMatch && !url.includes('/talent-tree/')) {
      const body = playable[Number(playableMatch[1])]
      if (body) return ok(body)
    }
    const treeMatch = url.match(/\/talent-tree\/\d+\/playable-specialization\/(\d+)/)
    if (treeMatch) {
      const body = trees[Number(treeMatch[1])]
      if (body) return ok(body)
    }
    if (url.includes('/media/item/') || url.includes('/media/spell/')) {
      return ok({ assets: [{ key: 'icon', value: 'https://render.worldofwarcraft.com/icons/56/inv_heap.jpg' }] })
    }
    const profile = url.match(/\/profile\/wow\/character\/([^/]+)\/([^/?]+)/)
    if (profile) {
      const name = profile[2] ?? ''
      const match = name.match(/^s(\d+)p(\d+)$/)
      if (!match) return { status: 404, headers: headers(), body: { error: 'not found' } }
      const specId = Number(match[1])
      const spec = HEAP_SPECS.find(row => row.specId === specId)
      if (!spec) return { status: 404, headers: headers(), body: { error: 'not found' } }
      const code = loadouts.get(specId)!
      if (url.includes('/specializations')) {
        return ok(fixtureSpecializations(specId, spec.specName, [specId * 10 + 1], code))
      }
      if (url.includes('/equipment')) {
        const equipment = fixtureEquipment([
          { slot: 'HEAD', id: 30000 + specId, name: `${spec.specName} Helm`, ilvl: 668 },
        ]) as Record<string, unknown>
        return ok({ ...equipment, _pad: uniquePad ? Buffer.alloc(padBytes, (specId + name.length) % 256).toString('latin1') : pad })
      }
      return ok(fixtureCharacter({ id: 1, name: 'Human' }, specId, spec.specName))
    }
    throw new Error(`Unexpected heap fixture URL: ${url}`)
  }
}

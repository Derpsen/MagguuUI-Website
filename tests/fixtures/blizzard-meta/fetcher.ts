import type { BlizzardFetcher, BlizzardHttpResponse } from '../../../server/utils/blizzardHttp'
import {
  FIXTURE_BOARD_401,
  FIXTURE_BOARD_402,
  FIXTURE_BOARD_INDEX,
  FIXTURE_ITEM_MEDIA,
  FIXTURE_PERIOD_INDEX,
  FIXTURE_PLAYABLE_SPECS,
  FIXTURE_PROFILES,
  FIXTURE_REALM_INDEX,
  FIXTURE_SEASON,
  FIXTURE_SEASON_INDEX,
  FIXTURE_SPEC_INDEX,
  FIXTURE_TALENT_TREES,
  FIXTURE_TOKEN,
} from './responses'

export function headers(init: Record<string, string> = {}): { get(name: string): string | null } {
  return {
    get(name) {
      const key = Object.keys(init).find(k => k.toLowerCase() === name.toLowerCase())
      return key ? init[key]! : null
    },
  }
}

export function ok(body: unknown): BlizzardHttpResponse {
  return { status: 200, headers: headers(), body }
}

export function fixtureFetcher(): BlizzardFetcher {
  return async (input) => {
    if (input.url.includes('oauth.battle.net/token')) return ok(FIXTURE_TOKEN)
    const url = input.url
    if (url.includes('/mythic-keystone/season/index')) return ok(FIXTURE_SEASON_INDEX)
    if (url.includes('/mythic-keystone/season/14')) return ok(FIXTURE_SEASON)
    if (url.includes('/mythic-keystone/period/index')) return ok(FIXTURE_PERIOD_INDEX)
    if (url.includes('/connected-realm/index')) return ok(FIXTURE_REALM_INDEX)
    if (/connected-realm\/\d+\/mythic-leaderboard\/index/.test(url)) return ok(FIXTURE_BOARD_INDEX)
    if (url.includes('/mythic-leaderboard/401/')) return ok(FIXTURE_BOARD_401)
    if (url.includes('/mythic-leaderboard/402/')) return ok(FIXTURE_BOARD_402)
    if (url.includes('/playable-specialization/index')) return ok(FIXTURE_SPEC_INDEX)
    const playable = url.match(/\/playable-specialization\/(\d+)/)
    if (playable && !url.includes('/talent-tree/')) {
      const body = FIXTURE_PLAYABLE_SPECS[Number(playable[1])]
      if (body) return ok(body)
    }
    const tree = url.match(/\/talent-tree\/\d+\/playable-specialization\/(\d+)/)
    if (tree) {
      const body = FIXTURE_TALENT_TREES[Number(tree[1])]
      if (body) return ok(body)
    }
    const itemMedia = url.match(/\/media\/item\/(\d+)/)
    if (itemMedia) return ok(FIXTURE_ITEM_MEDIA[Number(itemMedia[1])] ?? { assets: [] })
    const spellMedia = url.match(/\/media\/spell\/(\d+)/)
    if (spellMedia) return ok({ assets: [{ key: 'icon', value: `https://render.worldofwarcraft.com/icons/56/spell_${spellMedia[1]}.jpg` }] })
    const profile = url.match(/\/profile\/wow\/character\/([^/]+)\/([^/?]+)/)
    if (profile) {
      const key = `${profile[1]}/${profile[2]}`
      const row = FIXTURE_PROFILES[key]
      if (!row) return { status: 404, headers: headers(), body: { error: 'not found' } }
      if (url.includes('/specializations')) return ok(row.specs)
      if (url.includes('/equipment')) return ok(row.equipment)
      return ok(row.character)
    }
    throw new Error(`Unexpected fixture URL: ${url}`)
  }
}


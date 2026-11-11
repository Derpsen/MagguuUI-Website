import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import Database from 'better-sqlite3'
import {
  FIXTURE_BOARD_401,
  FIXTURE_BOARD_402,
  FIXTURE_BOARD_INDEX,
  FIXTURE_CREDENTIALS,
  FIXTURE_ITEM_MEDIA,
  FIXTURE_LOADOUT,
  FIXTURE_PERIOD_INDEX,
  FIXTURE_PLAYABLE_SPECS,
  FIXTURE_PROFILES,
  FIXTURE_REALM_INDEX,
  FIXTURE_SEASON,
  FIXTURE_SEASON_INDEX,
  FIXTURE_SPEC_INDEX,
  FIXTURE_TALENT_TREES,
  FIXTURE_TOKEN,
} from '../fixtures/blizzard-meta/responses'
import { initializeDatabase } from '../../server/database/bootstrap'
import { resetBlizzardAccessTokenCache } from '../../server/utils/blizzardAuth'
import type { BlizzardFetcher, BlizzardHttpResponse } from '../../server/utils/blizzardHttp'
import { resetBlizzardMetaLock, tryAcquireBlizzardMetaLock } from '../../server/utils/blizzardMetaLock'
import { buildMetaSnapshot, runScheduledBlizzardMetaSync, runScheduledBlizzardMetaSyncGuarded } from '../../server/utils/blizzardMetaSync'
import { readCurrentMetaSnapshot, readLastMetaRun } from '../../server/utils/blizzardMetaStore'
import { parseMetaSnapshotPayload } from '../../utils/metaSnapshot'
import { META_MIN_BUILD_SAMPLE, talentBand } from '../../utils/metaTypes'
import { formatShare, statPrioritySymbol } from '../../utils/metaFormat'

function headers(init: Record<string, string> = {}): { get(name: string): string | null } {
  return {
    get(name) {
      const key = Object.keys(init).find(k => k.toLowerCase() === name.toLowerCase())
      return key ? init[key]! : null
    },
  }
}

function ok(body: unknown): BlizzardHttpResponse {
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

function openStore() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  return sqlite
}

const armedConfig = {
  metaNightly: 'on',
  blizzardClientId: 'id',
  blizzardClientSecret: 'secret',
}

describe('blizzard meta sync from fixtures', () => {
  beforeEach(() => {
    resetBlizzardAccessTokenCache()
    resetBlizzardMetaLock()
  })

  it('aggregates popular specs, majority best build, talents, gear and freshness without network or player names', async () => {
    const { payload, failures } = await buildMetaSnapshot({
      fetcher: fixtureFetcher(),
      credentials: FIXTURE_CREDENTIALS,
      sleep: async () => {},
      now: 1_700_000_000_000,
    })
    const dumped = JSON.stringify(payload)
    assert.doesNotMatch(dumped, /Fireone|Firetwo|Arcaneone|twisting-nether|kazzak|Firemismatch|Firestale/i)
    assert.equal(payload.region, 'eu')
    assert.equal(payload.freshness.source, 'blizzard')
    assert.ok(payload.freshness.players > 0)
    assert.ok(payload.freshness.keyLevels)
    assert.ok(payload.freshness.keyLevels.max >= payload.freshness.keyLevels.min)
    assert.deepEqual(payload.periods?.included.map(row => row.id), [999, 998, 997])
    assert.equal(payload.basis.players, payload.freshness.players)
    assert.ok(parseMetaSnapshotPayload(payload))

    const mage = payload.classes.find(cls => cls.slug === 'mage')
    assert.ok(mage)
    const fire = mage.specs.find(spec => spec.slug === 'fire')
    assert.ok(fire)
    assert.ok(fire.n >= 3)
    assert.equal(fire.lowSample, fire.n < META_MIN_BUILD_SAMPLE)
    assert.ok(fire.loadouts.some(row => row.code === FIXTURE_LOADOUT.fireA || row.code === FIXTURE_LOADOUT.fireB))
    assert.ok(fire.talents.class.some(row => row.id === 101 && row.band === talentBand(row.share)))
    const helm = fire.gearSlots.find(slot => slot.slot === 'HEAD')?.items[0]
    assert.equal(helm?.itemId, 22001)
    assert.equal(helm?.setName, 'Cinder Set')
    assert.equal(helm?.ilvl, 668)
    assert.equal(helm?.source, 'Dungeon')
    assert.equal(helm?.icon, 'inv_helm_cinders')
    assert.ok(fire.stats.some(stat => stat.id === 'crit' || stat.label.toLowerCase().includes('crit')))
    assert.ok(fire.heroSplit.length >= 1)
    assert.ok(fire.talentsByHero.length >= 1)
    assert.ok(fire.races.some(race => race.label === 'Gnome'))
    assert.equal(failures.specMismatch >= 1, true)
    assert.ok(payload.sampled.unknownTalentNodes >= 1)
    assert.ok(fire.talents.class.some(row => row.id === 55555 && row.unmapped))
    assert.ok(fire.talentLayout?.class.some(node => node.node === 99830 && node.type === 'CHOICE' && node.choices.length === 0))
    // Stale tree hash dropped; remaining fire loadouts keep the majority group.
    assert.ok(!fire.loadouts.some(row => row.treeHash === 'aabbccddaabbccddaabbccddaabbccdd'))
    const unmappedStillKept = fire.loadouts.length >= 1
    assert.ok(unmappedStillKept)
  })

  it('skips when the flag is off or credentials are missing, and stays locked when already running', async () => {
    const sqlite = openStore()
    const off = await runScheduledBlizzardMetaSync({
      sqlite,
      config: { metaNightly: false, blizzardClientId: 'id', blizzardClientSecret: 'secret' },
      fetcher: fixtureFetcher(),
      now: 1_700_000_000_000,
    })
    assert.equal(off.status, 'skipped')
    assert.match(off.reason || '', /NUXT_META_NIGHTLY/)
    assert.equal(readLastMetaRun(sqlite)?.status, 'skipped')

    const noCreds = await runScheduledBlizzardMetaSync({
      sqlite,
      config: { metaNightly: true },
      fetcher: fixtureFetcher(),
      now: 1_700_000_000_000,
    })
    assert.equal(noCreds.status, 'skipped')
    assert.match(noCreds.reason || '', /NUXT_BLIZZARD_CLIENT_ID/)

    tryAcquireBlizzardMetaLock(1_700_000_000_000)
    const locked = await runScheduledBlizzardMetaSync({
      sqlite,
      config: armedConfig,
      fetcher: fixtureFetcher(),
      now: 1_700_000_000_000,
    })
    assert.equal(locked.status, 'locked')
  })

  it('cleans expired snapshots even when the nightly flag is off', async () => {
    const sqlite = openStore()
    const first = await runScheduledBlizzardMetaSync({
      sqlite,
      config: armedConfig,
      fetcher: fixtureFetcher(),
      sleep: async () => {},
      now: 1_700_000_000_000,
    })
    assert.equal(first.status, 'ok')
    assert.ok(readCurrentMetaSnapshot(sqlite, 'eu', 1_700_000_000_000))
    const later = 1_700_000_000_000 + 31 * 24 * 60 * 60 * 1000
    const cleanup = await runScheduledBlizzardMetaSync({
      sqlite,
      config: { metaNightly: false, blizzardClientId: 'id', blizzardClientSecret: 'secret' },
      fetcher: fixtureFetcher(),
      now: later,
    })
    assert.equal(cleanup.status, 'skipped')
    assert.equal(readCurrentMetaSnapshot(sqlite, 'eu', later), null)
  })

  it('writes a snapshot when armed, redacts secrets on failure, and backs off on 429', async () => {
    const sqlite = openStore()
    const kuma: string[] = []
    const okRun = await runScheduledBlizzardMetaSync({
      sqlite,
      config: { ...armedConfig, metaKumaPushUrl: 'https://kuma.example/api/push/token' },
      fetcher: fixtureFetcher(),
      sleep: async () => {},
      now: 1_700_000_000_000,
      kumaPush: async (base, status) => {
        kuma.push(`${status}:${String(base)}`)
        return 'pushed'
      },
      purgeMeta: async () => 'purged',
    })
    assert.equal(okRun.status, 'ok')
    assert.ok(readCurrentMetaSnapshot(sqlite, 'eu', 1_700_000_000_000))
    assert.ok(kuma.some(row => row.startsWith('up:')))

    resetBlizzardAccessTokenCache()
    const waits: number[] = []
    let calls = 0
    const flaky: BlizzardFetcher = async (input) => {
      if (input.url.includes('oauth.battle.net/token')) {
        calls += 1
        if (calls === 1) return { status: 429, headers: headers({ 'Retry-After': '2' }), body: {} }
        return ok(FIXTURE_TOKEN)
      }
      return fixtureFetcher()(input)
    }
    const result = await buildMetaSnapshot({
      fetcher: flaky,
      credentials: { id: 'secret-id-value', secret: 'secret-secret-value' },
      sleep: async (ms) => { waits.push(ms) },
      now: 1_700_000_000_100,
    })
    assert.ok(result.payload.classes.length)
    assert.equal(waits[0], 2000)

    const failed = await runScheduledBlizzardMetaSyncGuarded({
      sqlite,
      config: { metaNightly: true, blizzardClientId: 'leaked-id', blizzardClientSecret: 'leaked-secret' },
      fetcher: async () => { throw new Error('boom leaked-id leaked-secret Bearer abc.token') },
      now: 1_700_000_000_000,
    })
    assert.equal(failed.status, 'error')
    assert.doesNotMatch(failed.reason || '', /leaked-id|leaked-secret|abc\.token/)
  })
})

describe('share helpers', () => {
  it('formats pick rates and stat priority gaps', () => {
    assert.equal(formatShare(0.14), '14%')
    assert.equal(formatShare(0.959), '95.9%')
    assert.equal(statPrioritySymbol(100, 80), '>>')
    assert.equal(statPrioritySymbol(100, 90), '>')
    assert.equal(statPrioritySymbol(100, 97), '≥')
  })
})

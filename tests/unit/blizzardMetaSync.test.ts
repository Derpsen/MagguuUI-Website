import assert from 'node:assert/strict'
import { describe, it, beforeEach } from 'node:test'
import Database from 'better-sqlite3'
import {
  FIXTURE_BOARD_401,
  FIXTURE_BOARD_402,
  FIXTURE_BOARD_INDEX,
  FIXTURE_CREDENTIALS,
  FIXTURE_PERIOD_INDEX,
  FIXTURE_PROFILES,
  FIXTURE_REALM_INDEX,
  FIXTURE_SEASON,
  FIXTURE_SEASON_INDEX,
  FIXTURE_TOKEN,
} from '../fixtures/blizzard-meta/responses'
import { resetBlizzardAccessTokenCache } from '../../server/utils/blizzardAuth'
import type { BlizzardFetcher, BlizzardHttpResponse } from '../../server/utils/blizzardHttp'
import { resetBlizzardMetaLock, tryAcquireBlizzardMetaLock } from '../../server/utils/blizzardMetaLock'
import { buildMetaSnapshot, runScheduledBlizzardMetaSync, runScheduledBlizzardMetaSyncGuarded } from '../../server/utils/blizzardMetaSync'
import { readCurrentMetaSnapshot } from '../../server/utils/blizzardMetaStore'
import { META_MIN_SAMPLE, talentBand } from '../../utils/metaTypes'
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

function fixtureFetcher(): BlizzardFetcher {
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
  sqlite.exec(`
    CREATE TABLE meta_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      region TEXT NOT NULL,
      season TEXT,
      period TEXT,
      fetched_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      status TEXT NOT NULL,
      payload TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'blizzard'
    );
  `)
  return sqlite
}

describe('blizzard meta sync from fixtures', () => {
  beforeEach(() => {
    resetBlizzardAccessTokenCache()
    resetBlizzardMetaLock()
  })

  it('aggregates popular specs, loadouts, talents, gear and freshness without network or player names', async () => {
    const payload = await buildMetaSnapshot({
      fetcher: fixtureFetcher(),
      credentials: FIXTURE_CREDENTIALS,
      sleep: async () => {},
      now: 1_700_000_000_000,
    })
    const dumped = JSON.stringify(payload)
    assert.doesNotMatch(dumped, /Fireone|Firetwo|Arcaneone|twisting-nether|kazzak/i)
    assert.equal(payload.region, 'eu')
    assert.equal(payload.freshness.source, 'blizzard')
    assert.ok(payload.freshness.characters > 0)
    assert.ok(payload.freshness.keyLevels)
    assert.ok(payload.freshness.keyLevels.max >= payload.freshness.keyLevels.min)

    const mage = payload.classes.find(cls => cls.slug === 'mage')
    assert.ok(mage)
    const fire = mage.specs.find(spec => spec.slug === 'fire')
    assert.ok(fire)
    assert.ok(fire.characterCount >= 3)
    assert.equal(fire.belowMinSample, fire.characterCount < META_MIN_SAMPLE)
    assert.ok(fire.loadouts[0]?.code === 'CODE-FIRE-A' || fire.loadouts.some(row => row.code.startsWith('CODE-FIRE')))
    assert.ok(fire.talents.class.some(row => row.id === 101 && row.band === talentBand(row.share)))
    assert.ok(fire.gearSlots.some(slot => slot.slot === 'HEAD' && slot.items[0]?.itemId === 22001 && slot.items[0]?.setName === 'Cinder Set'))
    assert.ok(fire.stats.some(stat => stat.id === 'crit' || stat.name.toLowerCase().includes('crit')))
    assert.ok(fire.heroSplit.length >= 1)
    assert.ok(fire.races.some(race => race.name === 'Gnome'))
  })

  it('skips when the flag is off or credentials are missing, and stays locked when already running', async () => {
    const sqlite = openStore()
    const off = await runScheduledBlizzardMetaSync({
      sqlite,
      config: { blizzardMetaNightly: false, blizzardClientId: 'id', blizzardClientSecret: 'secret' },
      fetcher: fixtureFetcher(),
      now: 1_700_000_000_000,
    })
    assert.equal(off.status, 'skipped')
    assert.match(off.reason || '', /NUXT_BLIZZARD_META_NIGHTLY/)

    const noCreds = await runScheduledBlizzardMetaSync({
      sqlite,
      config: { blizzardMetaNightly: true },
      fetcher: fixtureFetcher(),
      now: 1_700_000_000_000,
    })
    assert.equal(noCreds.status, 'skipped')
    assert.match(noCreds.reason || '', /NUXT_BLIZZARD_CLIENT_ID/)

    tryAcquireBlizzardMetaLock(1_700_000_000_000)
    const locked = await runScheduledBlizzardMetaSync({
      sqlite,
      config: { blizzardMetaNightly: true, blizzardClientId: 'id', blizzardClientSecret: 'secret' },
      fetcher: fixtureFetcher(),
      now: 1_700_000_000_000,
    })
    assert.equal(locked.status, 'locked')
  })

  it('writes a snapshot when armed, redacts secrets on failure, and backs off on 429', async () => {
    const sqlite = openStore()
    const okRun = await runScheduledBlizzardMetaSync({
      sqlite,
      config: { blizzardMetaNightly: 'on', blizzardClientId: 'id', blizzardClientSecret: 'secret' },
      fetcher: fixtureFetcher(),
      sleep: async () => {},
      now: 1_700_000_000_000,
    })
    assert.equal(okRun.status, 'ok')
    assert.ok(readCurrentMetaSnapshot(sqlite, 'eu', 1_700_000_000_000))

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
    assert.ok(result.classes.length)
    assert.deepEqual(waits, [2000])

    const failed = await runScheduledBlizzardMetaSyncGuarded({
      sqlite,
      config: { blizzardMetaNightly: true, blizzardClientId: 'leaked-id', blizzardClientSecret: 'leaked-secret' },
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

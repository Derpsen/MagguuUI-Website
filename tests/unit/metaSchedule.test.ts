import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isBlizzardMetaNightlyEnabled,
  nextBlizzardMetaNightlyRun,
  parseBlizzardMetaNightlyFlag,
  resetBlizzardMetaNightlyFlagWarning,
} from '../../utils/metaSchedule'

describe('blizzard meta nightly UTC clock', () => {
  it('returns the next 03:15 UTC even when the process TZ is Europe/Berlin', () => {
    const prev = process.env.TZ
    process.env.TZ = 'Europe/Berlin'
    try {
      assert.equal(nextBlizzardMetaNightlyRun(new Date('2026-01-15T12:00:00.000Z')).toISOString(), '2026-01-16T03:15:00.000Z')
      assert.equal(nextBlizzardMetaNightlyRun(new Date('2026-07-15T12:00:00.000Z')).toISOString(), '2026-07-16T03:15:00.000Z')
      assert.equal(nextBlizzardMetaNightlyRun(new Date('2026-01-16T03:14:59.999Z')).toISOString(), '2026-01-16T03:15:00.000Z')
      assert.equal(nextBlizzardMetaNightlyRun(new Date('2026-01-16T03:15:00.000Z')).toISOString(), '2026-01-17T03:15:00.000Z')
    } finally {
      if (prev == null) delete process.env.TZ
      else process.env.TZ = prev
    }
  })
})

describe('NUXT_BLIZZARD_META_NIGHTLY kill switch', () => {
  it('is off by default in development and in production', () => {
    assert.equal(isBlizzardMetaNightlyEnabled({ NODE_ENV: 'development' }, 'development'), false)
    assert.equal(isBlizzardMetaNightlyEnabled({ NODE_ENV: 'production' }, 'production'), false)
    assert.equal(isBlizzardMetaNightlyEnabled({ NODE_ENV: 'production', NUXT_BLIZZARD_META_NIGHTLY: '' }, 'production'), false)
  })

  it('treats off/false/0/no as off and on/true/1/yes as on, case-insensitive and trimmed', () => {
    for (const value of ['off', 'OFF', ' false ', '0', 'No']) {
      assert.equal(parseBlizzardMetaNightlyFlag(value, 'production'), false, value)
    }
    for (const value of ['on', 'ON', ' true ', '1', 'Yes']) {
      assert.equal(parseBlizzardMetaNightlyFlag(value, 'development'), true, value)
    }
    assert.equal(isBlizzardMetaNightlyEnabled({ NUXT_BLIZZARD_META_NIGHTLY: 'off' }, 'production'), false)
    assert.equal(isBlizzardMetaNightlyEnabled({ NUXT_BLIZZARD_META_NIGHTLY: 'yes' }, 'development'), true)
    assert.equal(parseBlizzardMetaNightlyFlag(false, 'production'), false)
    assert.equal(parseBlizzardMetaNightlyFlag(true, 'development'), true)
  })

  it('warns once per process for unknown values and stays off', () => {
    resetBlizzardMetaNightlyFlagWarning()
    const warnings: string[] = []
    const warn = (message: string) => { warnings.push(message) }
    assert.equal(parseBlizzardMetaNightlyFlag('maybe', 'production', warn), false)
    assert.equal(parseBlizzardMetaNightlyFlag('foo', 'development', warn), false)
    assert.equal(warnings.length, 1)
    assert.match(warnings[0]!, /not recognised/)
    assert.match(warnings[0]!, /maybe/)
    resetBlizzardMetaNightlyFlagWarning()
    assert.equal(parseBlizzardMetaNightlyFlag('bar', 'production', warn), false)
    assert.equal(warnings.length, 2)
  })
})

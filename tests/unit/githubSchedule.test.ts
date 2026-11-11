import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatBerlinTime, isGithubNightlyEnabled, nextGithubNightlyRun, parseGithubNightlyFlag, resetGithubNightlyFlagWarning } from '../../utils/githubSchedule'

describe('github nightly UTC clock', () => {
  it('returns the next 02:30 UTC even when the process TZ is Europe/Berlin', () => {
    const prev = process.env.TZ
    process.env.TZ = 'Europe/Berlin'
    try {
      assert.equal(nextGithubNightlyRun(new Date('2026-01-15T12:00:00.000Z')).toISOString(), '2026-01-16T02:30:00.000Z')
      assert.equal(nextGithubNightlyRun(new Date('2026-07-15T12:00:00.000Z')).toISOString(), '2026-07-16T02:30:00.000Z')
      assert.equal(nextGithubNightlyRun(new Date('2026-01-16T02:29:59.999Z')).toISOString(), '2026-01-16T02:30:00.000Z')
      assert.equal(nextGithubNightlyRun(new Date('2026-01-16T02:30:00.000Z')).toISOString(), '2026-01-17T02:30:00.000Z')
    } finally {
      if (prev == null) delete process.env.TZ
      else process.env.TZ = prev
    }
  })

  it('formats last/next run in Europe/Berlin (winter 03:30 CET, summer 04:30 CEST)', () => {
    assert.equal(formatBerlinTime('2026-11-12T02:30:00.000Z'), '12/11/2026, 03:30 CET')
    assert.equal(formatBerlinTime('2026-07-12T02:30:00.000Z'), '12/07/2026, 04:30 CEST')
    assert.equal(formatBerlinTime(null), '')
  })
})

describe('NUXT_GITHUB_NIGHTLY kill switch', () => {
  it('is off by default in development and on by default in production', () => {
    assert.equal(isGithubNightlyEnabled({ NODE_ENV: 'development' }, 'development'), false)
    assert.equal(isGithubNightlyEnabled({ NODE_ENV: 'production' }, 'production'), true)
    assert.equal(isGithubNightlyEnabled({ NODE_ENV: 'production', NUXT_GITHUB_NIGHTLY: '' }, 'production'), true)
  })

  it('treats off/false/0/no as off and on/true/1/yes as on, case-insensitive and trimmed', () => {
    for (const value of ['off', 'OFF', ' false ', '0', 'No']) {
      assert.equal(parseGithubNightlyFlag(value, 'production'), false, value)
    }
    for (const value of ['on', 'ON', ' true ', '1', 'Yes']) {
      assert.equal(parseGithubNightlyFlag(value, 'development'), true, value)
    }
    assert.equal(isGithubNightlyEnabled({ NUXT_GITHUB_NIGHTLY: 'off' }, 'production'), false)
    assert.equal(isGithubNightlyEnabled({ NUXT_GITHUB_NIGHTLY: 'yes' }, 'development'), true)
    assert.equal(parseGithubNightlyFlag(false, 'production'), false)
    assert.equal(parseGithubNightlyFlag(true, 'development'), true)
  })

  it('warns once per process for unknown values and uses the default', () => {
    resetGithubNightlyFlagWarning()
    const warnings: string[] = []
    const warn = (message: string) => { warnings.push(message) }
    assert.equal(parseGithubNightlyFlag('maybe', 'production', warn), true)
    assert.equal(parseGithubNightlyFlag('foo', 'development', warn), false)
    assert.equal(warnings.length, 1)
    assert.match(warnings[0]!, /not recognised/)
    assert.match(warnings[0]!, /maybe/)
    resetGithubNightlyFlagWarning()
    assert.equal(parseGithubNightlyFlag('bar', 'production', warn), true)
    assert.equal(warnings.length, 2)
  })
})

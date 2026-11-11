import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatBerlinTime, isGithubNightlyEnabled, nextGithubNightlyRun, parseGithubNightlyFlag } from '../../utils/githubSchedule'

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

  it('treats only false/0/no as off and true/1 as on, case-insensitive', () => {
    assert.equal(isGithubNightlyEnabled({ NUXT_GITHUB_NIGHTLY: 'false' }, 'production'), false)
    assert.equal(isGithubNightlyEnabled({ NUXT_GITHUB_NIGHTLY: 'FALSE' }, 'production'), false)
    assert.equal(isGithubNightlyEnabled({ NUXT_GITHUB_NIGHTLY: '0' }, 'production'), false)
    assert.equal(isGithubNightlyEnabled({ NUXT_GITHUB_NIGHTLY: 'no' }, 'production'), false)
    assert.equal(isGithubNightlyEnabled({ NUXT_GITHUB_NIGHTLY: 'true' }, 'development'), true)
    assert.equal(isGithubNightlyEnabled({ NUXT_GITHUB_NIGHTLY: 'TRUE' }, 'development'), true)
    assert.equal(isGithubNightlyEnabled({ NUXT_GITHUB_NIGHTLY: '1' }, 'development'), true)
    assert.equal(parseGithubNightlyFlag(false, 'production'), false)
    assert.equal(parseGithubNightlyFlag(true, 'development'), true)
  })

  it('warns and uses the default for unknown values', () => {
    const warnings: string[] = []
    const warn = (message: string) => { warnings.push(message) }
    assert.equal(parseGithubNightlyFlag('off', 'production', warn), true)
    assert.equal(parseGithubNightlyFlag('on', 'development', warn), false)
    assert.equal(parseGithubNightlyFlag('yes', 'development', warn), false)
    assert.equal(parseGithubNightlyFlag('maybe', 'production', warn), true)
    assert.equal(warnings.length, 4)
    assert.match(warnings[0]!, /not recognised/)
    assert.match(warnings[0]!, /off/)
  })
})

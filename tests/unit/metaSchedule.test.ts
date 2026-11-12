import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isMetaNightlyEnabled,
  nextBlizzardMetaNightlyRun,
  parseBlizzardRegion,
  parseMetaNightlyFlag,
  parseMetaMaxConcurrentSpecs, parseMetaSamplePerSpec,
  resetBlizzardRegionWarning,
  resetMetaNightlyFlagWarning,
  shouldArmMetaSchedule,
} from '../../utils/metaSchedule'
import { META_REGION, META_SAMPLE_PER_SPEC } from '../../utils/metaTypes'

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

describe('NUXT_META_NIGHTLY kill switch', () => {
  it('is off by default in development and in production', () => {
    assert.equal(isMetaNightlyEnabled({ NODE_ENV: 'development' }, 'development'), false)
    assert.equal(isMetaNightlyEnabled({ NODE_ENV: 'production' }, 'production'), false)
    assert.equal(isMetaNightlyEnabled({ NODE_ENV: 'production', NUXT_META_NIGHTLY: '' }, 'production'), false)
  })

  it('treats off/false/0/no as off and on/true/1/yes as on, case-insensitive and trimmed', () => {
    for (const value of ['off', 'OFF', ' false ', '0', 'No']) {
      assert.equal(parseMetaNightlyFlag(value, 'production'), false, value)
    }
    for (const value of ['on', 'ON', ' true ', '1', 'Yes']) {
      assert.equal(parseMetaNightlyFlag(value, 'development'), true, value)
    }
    assert.equal(isMetaNightlyEnabled({ NUXT_META_NIGHTLY: 'off' }, 'production'), false)
    assert.equal(isMetaNightlyEnabled({ NUXT_META_NIGHTLY: 'yes' }, 'development'), true)
    assert.equal(parseMetaNightlyFlag(false, 'production'), false)
    assert.equal(parseMetaNightlyFlag(true, 'development'), true)
  })

  it('warns once per process for unknown values and stays off', () => {
    resetMetaNightlyFlagWarning()
    const warnings: string[] = []
    const warn = (message: string) => { warnings.push(message) }
    assert.equal(parseMetaNightlyFlag('maybe', 'production', warn), false)
    assert.equal(parseMetaNightlyFlag('foo', 'development', warn), false)
    assert.equal(warnings.length, 1)
    assert.match(warnings[0]!, /not recognised/)
    assert.match(warnings[0]!, /maybe/)
    resetMetaNightlyFlagWarning()
    assert.equal(parseMetaNightlyFlag('bar', 'production', warn), false)
    assert.equal(warnings.length, 2)
  })
})

describe('region and sample caps', () => {
  it('accepts eu and falls back to eu for anything else', () => {
    resetBlizzardRegionWarning()
    const warnings: string[] = []
    assert.equal(parseBlizzardRegion('eu'), META_REGION)
    assert.equal(parseBlizzardRegion('US', (message) => warnings.push(message)), META_REGION)
    assert.equal(warnings.length, 1)
  })

  it('defaults the per-spec sample to 200 and accepts a positive override', () => {
    assert.equal(parseMetaSamplePerSpec(undefined), META_SAMPLE_PER_SPEC)
    assert.equal(parseMetaSamplePerSpec('150'), 150)
    assert.equal(parseMetaSamplePerSpec('nope'), META_SAMPLE_PER_SPEC)
  })

  it('defaults concurrent specs to one and caps at eight', () => {
    assert.equal(parseMetaMaxConcurrentSpecs(undefined), 1)
    assert.equal(parseMetaMaxConcurrentSpecs('3'), 3)
    assert.equal(parseMetaMaxConcurrentSpecs('99'), 8)
    assert.equal(parseMetaMaxConcurrentSpecs('0'), 1)
  })

  it('does not arm the scheduler in dev, CI, or e2e', () => {
    assert.equal(shouldArmMetaSchedule({ NODE_ENV: 'production' }), true)
    assert.equal(shouldArmMetaSchedule({ NODE_ENV: 'development' }), false)
    assert.equal(shouldArmMetaSchedule({ NODE_ENV: 'production', CI: 'true' }), false)
    assert.equal(shouldArmMetaSchedule({ NODE_ENV: 'production', NUXT_E2E_SEED: 'true' }), false)
  })
})

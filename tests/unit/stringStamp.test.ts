import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildStringStamp, stampVersion } from '../../utils/stringStamp'

const releases = [
  { version: 'v12.1.8', publishedAt: '2026-10-14T08:00:00.000Z' },
  { version: 'v12.1.7', publishedAt: '2026-10-01T08:00:00.000Z' },
  { version: 'v12.0.0', publishedAt: '2026-09-01T08:00:00.000Z' },
]

describe('stampVersion', () => {
  it('strips the v prefix and rejects non-version labels', () => {
    assert.equal(stampVersion('v12.1.8'), '12.1.8')
    assert.equal(stampVersion('12.1.8'), '12.1.8')
    assert.equal(stampVersion('v0.9.2-Dev-16'), '0.9.2-Dev-16')
    assert.equal(stampVersion('Unreleased'), null)
    assert.equal(stampVersion(''), null)
  })
})

describe('buildStringStamp', () => {
  it('uses the newest release published on or before the update day', () => {
    assert.deepEqual(buildStringStamp('2026-10-14T09:30:00.000Z', releases), {
      version: '12.1.8',
      date: '2026-10-14',
      label: 'Version 12.1.8, updated 2026-10-14',
    })
    assert.equal(buildStringStamp('2026-10-05T12:00:00.000Z', releases).version, '12.1.7')
  })

  it('counts a release from the same day even if it was published later that day', () => {
    // Strings are often saved just before the changelog row is synced.
    assert.equal(buildStringStamp('2026-10-14T01:00:00.000Z', releases).version, '12.1.8')
  })

  it('shows only the date when no release matches', () => {
    assert.deepEqual(buildStringStamp('2026-08-01T00:00:00.000Z', releases), {
      version: null,
      date: '2026-08-01',
      label: 'Updated 2026-08-01',
    })
    assert.equal(buildStringStamp('2026-10-14T00:00:00.000Z', []).label, 'Updated 2026-10-14')
    assert.equal(buildStringStamp('2026-10-14T00:00:00.000Z', null).label, 'Updated 2026-10-14')
  })

  it('shows nothing without a usable update time', () => {
    for (const bad of [null, undefined, '', 'not a date']) {
      assert.deepEqual(buildStringStamp(bad, releases), { version: null, date: null, label: '' })
    }
  })

  it('accepts unix seconds and Date objects, and skips Unreleased/undated rows', () => {
    const mixed = [
      { version: 'Unreleased', publishedAt: '2026-10-20T00:00:00.000Z' },
      { version: 'v12.1.9', publishedAt: null },
      { version: 'v12.1.8', publishedAt: new Date('2026-10-14T08:00:00.000Z') },
    ]
    assert.equal(buildStringStamp(Date.parse('2026-10-21T00:00:00Z') / 1000, mixed).label, 'Version 12.1.8, updated 2026-10-21')
    assert.equal(buildStringStamp(new Date('2026-10-21T00:00:00Z'), mixed).version, '12.1.8')
  })

  it('does not depend on release order', () => {
    const shuffled = [releases[2]!, releases[0]!, releases[1]!]
    assert.equal(buildStringStamp('2026-10-20T00:00:00Z', shuffled).version, '12.1.8')
  })
})

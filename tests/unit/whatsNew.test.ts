import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { changelogSinceHref, decideWhatsNew, displayVersion, latestReleaseVersion } from '../../utils/whatsNew'

describe('latestReleaseVersion', () => {
  it('takes the first readable version of the newest-first list', () => {
    assert.equal(latestReleaseVersion([{ version: 'v12.1.8' }, { version: 'v12.1.7' }]), 'v12.1.8')
    assert.equal(latestReleaseVersion([{ version: 'banana' }, { version: 'v1.0.0' }]), 'v1.0.0')
  })
  it('returns null for empty or missing lists', () => {
    assert.equal(latestReleaseVersion([]), null)
    assert.equal(latestReleaseVersion(null), null)
  })
})

describe('decideWhatsNew', () => {
  it('shows nothing and records the value for a first-time visitor', () => {
    assert.deepEqual(decideWhatsNew('v12.1.8', null), { action: 'record', latest: 'v12.1.8' })
    assert.deepEqual(decideWhatsNew('v12.1.8', ''), { action: 'record', latest: 'v12.1.8' })
  })
  it('shows the banner with the previous version after a newer release', () => {
    assert.deepEqual(decideWhatsNew('v12.1.8', 'v12.1.6'), { action: 'show', latest: 'v12.1.8', previous: 'v12.1.6' })
    assert.deepEqual(decideWhatsNew('v12.1.8', '12.1.7'), { action: 'show', latest: 'v12.1.8', previous: '12.1.7' })
  })
  it('does nothing when already up to date or without data', () => {
    assert.deepEqual(decideWhatsNew('v12.1.8', 'v12.1.8'), { action: 'none' })
    assert.deepEqual(decideWhatsNew('v12.1.8', '12.1.8'), { action: 'none' })
    assert.deepEqual(decideWhatsNew(null, 'v12.1.8'), { action: 'none' })
  })
  it('re-records instead of showing for a rollback or an unreadable stored value', () => {
    assert.deepEqual(decideWhatsNew('v12.1.6', 'v12.1.8'), { action: 'record', latest: 'v12.1.6' })
    assert.deepEqual(decideWhatsNew('v12.1.8', 'garbage'), { action: 'record', latest: 'v12.1.8' })
  })
})

describe('links', () => {
  it('builds the since link without the v prefix', () => {
    assert.equal(displayVersion(' v12.1.6 '), '12.1.6')
    assert.equal(changelogSinceHref('v12.1.6'), '/changelog?since=12.1.6')
    assert.equal(changelogSinceHref('12.1.6-Dev-16'), '/changelog?since=12.1.6-Dev-16')
  })
})

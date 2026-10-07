import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { initialStringsTab, queryFromStringsState } from '../../utils/stringsDeepLink'

describe('strings public deep links', () => {
  it('opens profiles from addon or profile without a tab param', () => {
    assert.equal(initialStringsTab({ addon: 'WIM' }), 'profiles')
    assert.equal(initialStringsTab({ profile: '12' }), 'profiles')
    assert.equal(initialStringsTab({ pack: 'Optional' }), 'wowup')
    assert.equal(initialStringsTab({ tab: 'layouts', addon: 'WIM' }), 'layouts')
    assert.equal(initialStringsTab({}), 'layouts')
  })

  it('keeps class, spec, profile, and pack in the public query', () => {
    assert.deepEqual(queryFromStringsState({
      tab: 'layouts',
      className: 'Mage',
      spec: 'Fire',
      addon: '',
      profileId: '',
      pack: '',
    }), { class: 'Mage', spec: 'Fire' })

    assert.deepEqual(queryFromStringsState({
      tab: 'profiles',
      className: 'Mage',
      spec: 'Fire',
      addon: 'WIM',
      profileId: '12',
      pack: '',
    }), { tab: 'profiles', addon: 'WIM', profile: '12' })

    assert.deepEqual(queryFromStringsState({
      tab: 'wowup',
      className: '',
      spec: '',
      addon: '',
      profileId: '',
      pack: 'Optional',
    }), { tab: 'wowup', pack: 'Optional' })
  })
})

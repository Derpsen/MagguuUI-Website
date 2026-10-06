import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { wowupLabel } from '../../utils/addonChipMeta'

describe('wowupLabel', () => {
  it('maps Required/Optional once without a trailing Addons suffix for callers to append', () => {
    assert.equal(wowupLabel('Required'), 'Starter Addons')
    assert.equal(wowupLabel('Optional'), 'Optional Addons')
    assert.equal(wowupLabel('Custom'), 'Custom')
    assert.doesNotMatch(wowupLabel('Required'), /Addons Addons/i)
    assert.doesNotMatch(wowupLabel('Optional'), /Addons Addons/i)
  })
})
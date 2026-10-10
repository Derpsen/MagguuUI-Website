import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { layoutSpecChoices, wowSpecIcon } from '../../utils/wowSpecs'

describe('cooldown layout specs', () => {
  it('lists Blood, Frost, and Unholy when the class file is one shared string', () => {
    assert.deepEqual(layoutSpecChoices('Death Knight', ['Cooldown Viewer']), ['Blood', 'Frost', 'Unholy'])
    assert.equal(wowSpecIcon('Death Knight', 'Blood'), '/spec-icons/deathknight-blood.jpg')
    assert.equal(wowSpecIcon('Demon Hunter', 'Devourer'), '/spec-icons/demonhunter-devourer.jpg')
  })

  it('keeps a real per-spec row ahead of the shared label', () => {
    assert.deepEqual(layoutSpecChoices('Mage', ['Frost', 'Cooldown Viewer']), ['Frost'])
  })
})

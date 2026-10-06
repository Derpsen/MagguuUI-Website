import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  addonGroupForSlug,
  changelogPreviewBullets,
  groupAddonChips,
  isWowupPackSlug,
  WOWUP_OPTIONAL_SLUGS,
  WOWUP_STARTER_SLUGS,
} from '../../utils/addonChipMeta'

describe('addon groups (Whisper≠WIM)', () => {
  it('puts EllesmereUI in Required and Whisper Messenger in WowUp, never WIM in WowUp', () => {
    assert.equal(addonGroupForSlug('ellesmereui', 'required'), 'required')
    assert.equal(addonGroupForSlug('whisper-messenger', 'optional'), 'wowup')
    assert.ok(WOWUP_OPTIONAL_SLUGS.has('whisper-messenger'))
    assert.equal(isWowupPackSlug('wim'), false)
    assert.equal(addonGroupForSlug('wim', 'optional'), 'optional')
    assert.ok(WOWUP_STARTER_SLUGS.has('exboss'))
    assert.ok(WOWUP_STARTER_SLUGS.has('bigwigs'))
    assert.equal(addonGroupForSlug('bigwigs', 'core'), 'wowup')
  })

  it('groups chips as Required → Optional → WowUp', () => {
    const groups = groupAddonChips([
      { key: 'wim', kind: 'optional' as const },
      { key: 'whisper-messenger', kind: 'wowup' as const },
      { key: 'ellesmereui', kind: 'required' as const },
    ])
    assert.deepEqual(groups.map(g => g.key), ['required', 'optional', 'wowup'])
    assert.equal(groups[0].items[0].key, 'ellesmereui')
    assert.equal(groups[1].items[0].key, 'wim')
    assert.equal(groups[2].items[0].key, 'whisper-messenger')
  })

  it('extracts three changelog bullets without bold/code markers', () => {
    const bullets = changelogPreviewBullets(`### What's new

- Updated **Magguu** profiles.
- **Smart Reminders** import now includes trash alerts.
- Open \`/mui\` and apply.
- Fourth ignored
`, 3)
    assert.equal(bullets.length, 3)
    assert.equal(bullets[0], 'Updated Magguu profiles.')
    assert.equal(bullets[1], 'Smart Reminders import now includes trash alerts.')
    assert.equal(bullets[2], 'Open /mui and apply.')
  })
})

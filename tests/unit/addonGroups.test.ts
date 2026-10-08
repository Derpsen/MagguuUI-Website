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

describe('addon groups', () => {
  it('puts EllesmereUI in Required and every other addon in Optional', () => {
    assert.equal(addonGroupForSlug('ellesmereui', 'required'), 'required')
    assert.equal(addonGroupForSlug('whisper-messenger', 'optional'), 'optional')
    assert.equal(addonGroupForSlug('wim', 'optional'), 'optional')
    assert.equal(addonGroupForSlug('bigwigs', 'core'), 'optional')
    assert.ok(WOWUP_OPTIONAL_SLUGS.has('whisper-messenger'))
    assert.equal(isWowupPackSlug('wim'), false)
    assert.ok(WOWUP_STARTER_SLUGS.has('exboss'))
    assert.ok(WOWUP_STARTER_SLUGS.has('bigwigs'))
  })

  it('groups chips as Required then Optional', () => {
    const groups = groupAddonChips([
      { key: 'wim', kind: 'optional' as const },
      { key: 'whisper-messenger', kind: 'optional' as const },
      { key: 'ellesmereui', kind: 'required' as const },
    ])
    assert.deepEqual(groups.map(g => g.key), ['required', 'optional'])
    assert.equal(groups[0]?.items[0]?.key, 'ellesmereui')
    assert.deepEqual(groups[1]?.items.map(item => item.key), ['wim', 'whisper-messenger'])
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

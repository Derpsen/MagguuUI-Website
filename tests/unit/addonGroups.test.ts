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
  it('puts EllesmereUI in Required, the Starter pack addons in Starter and the rest in Optional', () => {
    assert.equal(addonGroupForSlug('ellesmereui', 'required'), 'required')
    assert.equal(addonGroupForSlug('whisper-messenger', 'optional'), 'optional')
    assert.equal(addonGroupForSlug('wim', 'optional'), 'optional')
    for (const slug of ['bigwigs', 'littlewigs', 'northern-sky-raid-tools', 'exboss', 'excore']) assert.equal(addonGroupForSlug(slug, 'optional'), 'starter', slug)
    assert.equal(addonGroupForSlug('bigwigs', 'core'), 'starter')
    assert.equal(addonGroupForSlug('gtfo', 'optional'), 'optional')
    assert.deepEqual([...WOWUP_STARTER_SLUGS].sort(), ['bigwigs', 'ellesmereui', 'exboss', 'excore', 'littlewigs', 'northern-sky-raid-tools'])
    assert.ok(WOWUP_OPTIONAL_SLUGS.has('whisper-messenger'))
    assert.equal(isWowupPackSlug('wim'), false)
    assert.ok(WOWUP_STARTER_SLUGS.has('exboss'))
    assert.ok(WOWUP_STARTER_SLUGS.has('bigwigs'))
  })

  it('groups chips as Required, Starter pack, then Optional', () => {
    const groups = groupAddonChips([
      { key: 'bigwigs', kind: 'starter' as const },
      { key: 'wim', kind: 'optional' as const },
      { key: 'whisper-messenger', kind: 'optional' as const },
      { key: 'ellesmereui', kind: 'required' as const },
    ])
    assert.deepEqual(groups.map(g => g.key), ['required', 'starter', 'optional'])
    assert.deepEqual(groups.map(g => g.label), ['Required', 'Starter pack', 'Optional'])
    assert.equal(groups[0]?.items[0]?.key, 'ellesmereui')
    assert.deepEqual(groups[1]?.items.map(item => item.key), ['bigwigs'])
    assert.deepEqual(groups[2]?.items.map(item => item.key), ['wim', 'whisper-messenger'])
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

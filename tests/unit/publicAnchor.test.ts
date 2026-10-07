import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { wowupPackContainsWim } from '../../utils/addonChipMeta'
import { publicAnchorId } from '../../utils/publicAnchor'

describe('public anchors and WowUp publish guard', () => {
  it('builds stable faq and release anchors', () => {
    assert.equal(publicAnchorId('faq', 'Is MagguuUI free?'), 'faq-is-magguuui-free')
    assert.equal(publicAnchorId('release', 'v3.0.0'), 'release-v3-0-0')
  })

  it('blocks a WowUp pack that lists WIM and allows Whisper Messenger', () => {
    const wim = Buffer.from(JSON.stringify({ addons: [{ name: 'WIM' }] })).toString('base64')
    const chat = Buffer.from(JSON.stringify({ addons: [{ name: 'Whisper Messenger' }] })).toString('base64')
    assert.equal(wowupPackContainsWim(wim), true)
    assert.equal(wowupPackContainsWim(chat), false)
  })
})

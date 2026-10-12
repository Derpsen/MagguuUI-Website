import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractAddonChips, extractMuiCommands, featureCardMeta, splitFeatureAddons } from '../../utils/featureCardMeta'

test('extractMuiCommands finds unique /mui commands in code tags', () => {
  const html = 'Open with <code>/mui</code>. Tools via <code>/mui tools</code> or <code>/mui</code>. <code>/reload</code>'
  assert.deepEqual(extractMuiCommands(html), ['/mui', '/mui tools'])
  assert.deepEqual(extractMuiCommands(''), [])
})

test('extractAddonChips keeps names as written and adds icons', () => {
  const chips = extractAddonChips('Optional Magguu profiles for BigWigs, Northern Sky, Whisper Messenger, and Smart Reminders.')
  assert.deepEqual(chips.map(c => c.name), ['BigWigs', 'Northern Sky', 'Whisper Messenger', 'Smart Reminders'])
  assert.ok(chips.every(c => c.icon))
  assert.ok(!chips.some(c => /wim/i.test(c.name)))
  assert.deepEqual(extractAddonChips('No list here.'), [])
})

test('featureCardMeta cycles accents', () => {
  assert.equal(featureCardMeta(0).accent, 'gold')
  assert.equal(featureCardMeta(3).accent, 'gold')
})

test('splitFeatureAddons moves addon-only list items into chips', () => {
  const html = '<ul><li>Class layouts as <strong>Magguu - Class Spec</strong></li><li>BigWigs, Northern Sky, Whisper Messenger</li><li>GTFO, BugSack</li></ul>'
  const out = splitFeatureAddons(html)
  assert.deepEqual(out.addons.map(a => a.name), ['BigWigs', 'Northern Sky', 'Whisper Messenger', 'GTFO', 'BugSack'])
  assert.equal(out.html, '<ul><li>Class layouts as <strong>Magguu - Class Spec</strong></li></ul>')
})

test('addon chip icons use existing WebP thumbnails', async () => {
  const { existsSync } = await import('node:fs')
  for (const chip of extractAddonChips('Optional Magguu profiles for BigWigs, GTFO, Talent Tree Tweaks, and Whisper Messenger.')) {
    assert.match(chip.icon || '', /^\/addon-icons\/thumb\/.+\.webp$/)
    assert.ok(existsSync(`public${chip.icon}`), String(chip.icon))
  }
})

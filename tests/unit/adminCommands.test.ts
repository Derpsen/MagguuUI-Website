import assert from 'node:assert/strict'
import { test } from 'node:test'
import { builtInActions, filterCommands, groupCommands, moveActive } from '../../utils/adminCommands'
import type { PaletteItem } from '../../utils/adminCommands'

const item = (label: string, group = 'Content', description = '', extra: Partial<PaletteItem> = {}): PaletteItem => ({
  id: `${group}:${label}`, group, label, description, icon: 'i-x', to: `/admin/${label.toLowerCase()}`, ...extra,
})

const items = [
  item('Home', 'Content', 'Landing page copy'),
  item('FAQ', 'Content', 'Support answers'),
  item('Users', 'System', 'Accounts, passkeys and sessions'),
  item('Settings › Security', 'System', 'Sessions, rate limits, tracking.'),
  ...builtInActions(true),
]

test('empty query keeps order', () => {
  assert.deepEqual(filterCommands(items, '  ').map(i => i.id), items.map(i => i.id))
})

test('all words must match, case-insensitive', () => {
  assert.deepEqual(filterCommands(items, 'SETTINGS security').map(i => i.label), ['Settings › Security'])
  assert.deepEqual(filterCommands(items, 'faq nothing'), [])
})

test('label hits rank above description hits', () => {
  const ranked = filterCommands(items, 'sessions').map(i => i.label)
  assert.ok(ranked.includes('Users') && ranked.includes('Settings › Security'))
  const byLabel = filterCommands([item('Other', 'System', 'faq things'), item('FAQ')], 'faq').map(i => i.label)
  assert.deepEqual(byLabel, ['FAQ', 'Other'])
})

test('keywords make actions findable', () => {
  assert.equal(filterCommands(items, 'sign out')[0]?.action, 'logout')
  assert.equal(filterCommands(items, 'theme')[0]?.action, 'toggle-theme')
})

test('theme action label follows the mode', () => {
  assert.equal(builtInActions(true)[0]?.label, 'Switch to light mode')
  assert.equal(builtInActions(false)[0]?.label, 'Switch to dark mode')
  assert.ok(builtInActions(true).every(a => !a.to && a.action))
})

test('groups keep first-seen order and flat indexes', () => {
  const groups = groupCommands(filterCommands(items, ''))
  assert.deepEqual(groups.map(g => g.label), ['Content', 'System', 'Actions'])
  assert.deepEqual(groups.flatMap(g => g.items.map(i => i.index)), [0, 1, 2, 3, 4, 5])
})

test('moveActive wraps and handles empty lists', () => {
  assert.equal(moveActive(0, 0, 'down'), -1)
  assert.equal(moveActive(2, 3, 'down'), 0)
  assert.equal(moveActive(0, 3, 'up'), 2)
  assert.equal(moveActive(1, 3, 'home'), 0)
  assert.equal(moveActive(0, 3, 'end'), 2)
})

test('query is capped to six words', () => {
  assert.equal(filterCommands(items, 'home a b c d e f g').length, 0)
  assert.equal(filterCommands(items, 'home home home home home home zzz').length, 1)
})

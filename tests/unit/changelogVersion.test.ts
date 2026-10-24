import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compareVersions, filterChangelog, parseVersion } from '../../utils/changelogVersion'

test('parses common formats and rejects junk', () => {
  assert.deepEqual(parseVersion('12.1.8'), { nums: [12, 1, 8], pre: [] })
  assert.deepEqual(parseVersion(' v12.1.8 '), { nums: [12, 1, 8], pre: [] })
  assert.deepEqual(parseVersion('12.1.6-Dev-16'), { nums: [12, 1, 6], pre: ['dev', '16'] })
  assert.deepEqual(parseVersion('v12.1.9-Dev'), { nums: [12, 1, 9], pre: ['dev'] })
  for (const bad of ['', 'abc', '12.', '.1', '12.1.x', 'latest', '12..1']) assert.equal(parseVersion(bad), null, bad)
})

test('numeric parts compare numerically, missing parts are 0', () => {
  assert.equal(compareVersions('12.1.10', '12.1.9'), 1)
  assert.equal(compareVersions('12.0.25', '12.1.0'), -1)
  assert.equal(compareVersions('v12.1', '12.1.0'), 0)
  assert.equal(compareVersions('12.1.8', 'v12.1.8'), 0)
})

test('pre-releases sort before their release and among themselves', () => {
  assert.equal(compareVersions('12.1.6-Dev-16', '12.1.6'), -1)
  assert.equal(compareVersions('12.1.6-Dev-16', '12.1.5'), 1)
  assert.equal(compareVersions('12.1.6-Dev-16', '12.1.6-Dev-2'), 1)
  assert.equal(compareVersions('12.1.6-Dev', '12.1.6-Dev-1'), -1)
  assert.equal(compareVersions('12.1.6-Dev-3', '12.1.6-dev-3'), 0)
})

test('compareVersions returns null for unparseable input', () => {
  assert.equal(compareVersions('nope', '12.1.8'), null)
})

const entries = [
  { version: 'v12.1.8', content: 'Fixes BigWigs import' },
  { version: 'v12.1.7', content: 'Northern Sky update' },
  { version: 'v12.1.6', content: 'bigwigs profile' },
  { version: 'v12.0.25', content: 'old stuff' },
]
const versions = (r: { items: { version: string }[] }) => r.items.map(i => i.version)

test('no filter returns everything and is inactive', () => {
  const r = filterChangelog(entries, {})
  assert.equal(r.active, false)
  assert.equal(r.items.length, 4)
})

test('since is exclusive and tolerates dev builds and the v prefix', () => {
  assert.deepEqual(versions(filterChangelog(entries, { since: '12.1.6' })), ['v12.1.8', 'v12.1.7'])
  assert.deepEqual(versions(filterChangelog(entries, { since: 'v12.1.6' })), ['v12.1.8', 'v12.1.7'])
  assert.deepEqual(versions(filterChangelog(entries, { since: '12.1.6-Dev-16' })), ['v12.1.8', 'v12.1.7', 'v12.1.6'])
  assert.deepEqual(versions(filterChangelog(entries, { since: '12.1.8' })), [])
  assert.deepEqual(versions(filterChangelog(entries, { since: '13.0.0' })), [])
})

test('from/to are inclusive and combine with q', () => {
  assert.deepEqual(versions(filterChangelog(entries, { from: '12.1.6', to: '12.1.7' })), ['v12.1.7', 'v12.1.6'])
  assert.deepEqual(versions(filterChangelog(entries, { from: '12.1.6', q: 'BIGWIGS' })), ['v12.1.8', 'v12.1.6'])
  assert.deepEqual(versions(filterChangelog(entries, { q: 'northern' })), ['v12.1.7'])
})

test('unparseable versions are ignored and reported', () => {
  const r = filterChangelog(entries, { since: 'banana' })
  assert.equal(r.active, false)
  assert.equal(r.items.length, 4)
  assert.equal(r.errors.length, 1)
})

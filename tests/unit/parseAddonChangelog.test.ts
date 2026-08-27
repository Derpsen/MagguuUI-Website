import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  compareAddonVersions,
  isAddonReleaseVersion,
  parseAddonChangelog,
  pickLatestAddonChangelog,
} from '../../server/utils/parseAddonChangelog'

describe('parseAddonChangelog', () => {
  const markdown = `# Changelog

## v12.1.0 (2026-08-22)

Ready for WoW 12.1.

## v12.0.21 (2026-04-16)

Older notes.

## v11.0.0 (2025-01-01)

Legacy.
`

  it('parses every ## version heading', () => {
    const entries = parseAddonChangelog(markdown)
    assert.equal(entries.length, 3)
    assert.equal(entries[0]?.version, 'v12.1.0')
    assert.equal(entries[2]?.version, 'v11.0.0')
  })

  it('picks only the newest version for public/store sync', () => {
    const latest = pickLatestAddonChangelog(parseAddonChangelog(markdown))
    assert.equal(latest?.version, 'v12.1.0')
    assert.match(latest?.content || '', /Ready for WoW 12\.1/)
  })

  it('treats addon releases as v-prefixed versions, not Sync rows', () => {
    assert.equal(isAddonReleaseVersion('v12.1.0'), true)
    assert.equal(isAddonReleaseVersion('Sync 2026-08-22'), false)
    assert.equal(isAddonReleaseVersion('auto'), false)
    assert.ok(compareAddonVersions('v12.1.0', 'v12.0.21') > 0)
  })
})
